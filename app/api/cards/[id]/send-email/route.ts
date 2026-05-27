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

const recipientBodySchema = z.object({
  kind: z.literal("recipient"),
  email: z.string().trim().email(),
})

const contributorBodySchema = z.object({
  kind: z.literal("contributor"),
  emails: z
    .array(z.string().trim().email())
    .min(1, "At least one email is required")
    .max(MAX_CONTRIBUTOR_EMAILS, MAX_CONTRIBUTOR_EMAILS_ERROR),
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

    if (cardError || !card) {
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
      const recipientName = (card.recipient_name ?? "there").trim()
      const senderName = (card.sender_name ?? "Someone").trim()
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

      const updates: Record<string, string> = {
        recipient_email: destinationEmail,
        updated_at: new Date().toISOString(),
      }
      if (!card.sent_at) updates.sent_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
      if (updateError) {
        console.error(
          "[POST /api/cards/[id]/send-email] card update:",
          updateError,
        )
        return jsonWithRateLimit(
          {
            ok: true,
            emailSent: true,
            persistenceFailed: true,
            sentAt: updates.sent_at ?? card.sent_at ?? null,
          },
          rateLimitHeaders,
        )
      }

      return jsonWithRateLimit(
        {
          ok: true,
          sentAt: updates.sent_at ?? card.sent_at,
        },
        rateLimitHeaders,
      )
    }

    const recipientName = (card.recipient_name ?? "your recipient").trim()
    const senderName = (card.sender_name ?? "Someone").trim()
    const link = `${baseUrl}/contribute/${card.contributor_link_id}`
    const uniqueEmails = [...new Set(parsed.data.emails.map((e) => e.trim()))]

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
      return jsonWithRateLimit(
        { error: failed[0]?.result.error ?? "Failed to send email" },
        rateLimitHeaders,
        { status: 500 },
      )
    }

    return jsonWithRateLimit(
      {
        ok: true,
        sentCount: succeeded.length,
        partial: true,
        failedEmails: failed.map((entry) => ({
          email: entry.email,
          error: entry.result.error,
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
