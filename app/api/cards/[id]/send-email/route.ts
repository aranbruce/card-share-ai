import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/app-url"
import {
  sendContributorInviteEmail,
  sendRecipientCardEmail,
} from "@/lib/email/resend"
import {
  MAX_CONTRIBUTOR_EMAILS,
  MAX_CONTRIBUTOR_EMAILS_ERROR,
} from "@/lib/email/constants"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"

const CONTRIBUTOR_EMAIL_CONCURRENCY = 5

function displayName(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim()
  return trimmed || fallback
}

function normalizeContributorEmails(emails: unknown): string[] {
  if (!Array.isArray(emails)) return []

  const unique = new Set<string>()
  for (const entry of emails) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (trimmed) unique.add(trimmed)
  }
  return [...unique]
}

const recipientBodySchema = z.object({
  kind: z.literal("recipient"),
  email: z.string().trim().email(),
})

const contributorBodySchema = z.object({
  kind: z.literal("contributor"),
  emails: z.preprocess(
    normalizeContributorEmails,
    z
      .array(z.string().email())
      .min(1, "At least one email is required")
      .max(MAX_CONTRIBUTOR_EMAILS, MAX_CONTRIBUTOR_EMAILS_ERROR),
  ),
})

const bodySchema = z.discriminatedUnion("kind", [
  recipientBodySchema,
  contributorBodySchema,
])

function jsonWithRateLimit(
  body: unknown,
  rateLimitHeaders: Record<string, string>,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    headers.set(key, value)
  }
  return NextResponse.json(body, {
    ...init,
    headers,
  })
}

function formatZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request payload"
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) break
      results[index] = await mapper(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:cards:send-email",
    maxRequests: 15,
    windowMs: 10 * 60 * 1000,
  })
  const rateLimitHeaders = rateLimit.headers

  if (!rateLimit.allowed) {
    return jsonWithRateLimit(
      { error: "Too many requests. Please try again later." },
      rateLimitHeaders,
      { status: 429 },
    )
  }

  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return jsonWithRateLimit({ error: "Unauthorized" }, rateLimitHeaders, {
        status: 401,
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonWithRateLimit(
        { error: "Invalid JSON body" },
        rateLimitHeaders,
        { status: 400 },
      )
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return jsonWithRateLimit(
        { error: formatZodError(parsed.error) },
        rateLimitHeaders,
        { status: 400 },
      )
    }

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select(
        "id, recipient_name, sender_name, recipient_email, contributor_link_id, sent_at",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (cardError) {
      console.error("[POST /api/cards/[id]/send-email] card lookup:", cardError)
      return jsonWithRateLimit(
        { error: "Failed to load card" },
        rateLimitHeaders,
        { status: 500 },
      )
    }
    if (!card) {
      return jsonWithRateLimit({ error: "Card not found" }, rateLimitHeaders, {
        status: 404,
      })
    }
    if (!card.contributor_link_id) {
      return jsonWithRateLimit(
        { error: "Card link is unavailable" },
        rateLimitHeaders,
        { status: 400 },
      )
    }

    const baseUrl = getAppUrl()

    if (parsed.data.kind === "recipient") {
      const destinationEmail = parsed.data.email.trim()
      const recipientName = displayName(card.recipient_name, "there")
      const senderName = displayName(card.sender_name, "Someone")
      const link = `${baseUrl}/view/${card.contributor_link_id}`

      const sendResult = await sendRecipientCardEmail({
        to: destinationEmail,
        recipientName,
        senderName,
        link,
      })
      if (!sendResult.ok) {
        return jsonWithRateLimit(
          { error: sendResult.error },
          rateLimitHeaders,
          { status: 500 },
        )
      }

      const now = new Date().toISOString()
      const { error: emailUpdateError } = await supabase
        .from("cards")
        .update({
          recipient_email: destinationEmail,
          updated_at: now,
        })
        .eq("id", id)
        .eq("user_id", user.id)

      if (emailUpdateError) {
        console.error(
          "[POST /api/cards/[id]/send-email] recipient_email update:",
          emailUpdateError,
        )
        return jsonWithRateLimit(
          {
            ok: true,
            emailSent: true,
            persistenceFailed: true,
            sentAt: card.sent_at ?? now,
          },
          rateLimitHeaders,
        )
      }

      let sentAt = card.sent_at
      if (!card.sent_at) {
        const attemptedSentAt = new Date().toISOString()
        const { data: sentRows, error: sentUpdateError } = await supabase
          .from("cards")
          .update({
            sent_at: attemptedSentAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .is("sent_at", null)
          .select("sent_at")

        if (sentUpdateError) {
          console.error(
            "[POST /api/cards/[id]/send-email] sent_at update:",
            sentUpdateError,
          )
          return jsonWithRateLimit(
            {
              ok: true,
              emailSent: true,
              persistenceFailed: true,
              sentAt: attemptedSentAt,
            },
            rateLimitHeaders,
          )
        }

        const persistedSentAt = sentRows?.[0]?.sent_at
        if (persistedSentAt) {
          sentAt = persistedSentAt
        } else {
          const { data: refreshed, error: refreshError } = await supabase
            .from("cards")
            .select("sent_at")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle()

          if (refreshError) {
            console.error(
              "[POST /api/cards/[id]/send-email] sent_at refresh:",
              refreshError,
            )
            return jsonWithRateLimit(
              {
                ok: true,
                emailSent: true,
                persistenceFailed: true,
                sentAt: attemptedSentAt,
              },
              rateLimitHeaders,
            )
          }

          sentAt = refreshed?.sent_at ?? attemptedSentAt
        }
      }

      return jsonWithRateLimit(
        {
          ok: true,
          sentAt,
        },
        rateLimitHeaders,
      )
    }

    const recipientName = displayName(card.recipient_name, "your recipient")
    const senderName = displayName(card.sender_name, "Someone")
    const link = `${baseUrl}/contribute/${card.contributor_link_id}`
    const uniqueEmails = parsed.data.emails

    const results = await mapWithConcurrency(
      uniqueEmails,
      CONTRIBUTOR_EMAIL_CONCURRENCY,
      async (destinationEmail) => ({
        email: destinationEmail,
        result: await sendContributorInviteEmail({
          to: destinationEmail,
          recipientName,
          senderName,
          link,
        }),
      }),
    )

    const succeeded = results.filter((entry) => entry.result.ok)
    const failed = results.filter((entry) => !entry.result.ok)

    if (failed.length === 0) {
      return jsonWithRateLimit(
        { ok: true, sentCount: succeeded.length },
        rateLimitHeaders,
      )
    }

    if (succeeded.length === 0) {
      const firstFailure = failed[0]?.result
      const errorMessage =
        firstFailure && !firstFailure.ok
          ? firstFailure.error
          : "Failed to send email"
      return jsonWithRateLimit({ error: errorMessage }, rateLimitHeaders, {
        status: 500,
      })
    }

    return jsonWithRateLimit(
      {
        ok: true,
        sentCount: succeeded.length,
        partial: true,
        failedEmails: failed.map((entry) => ({
          email: entry.email,
          error: !entry.result.ok ? entry.result.error : "Failed to send email",
        })),
      },
      rateLimitHeaders,
    )
  } catch (error) {
    console.error("[POST /api/cards/[id]/send-email]:", error)
    return jsonWithRateLimit(
      { error: "Failed to send email" },
      rateLimitHeaders,
      { status: 500 },
    )
  }
}
