import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  cancelCardSend,
  parseSendAt,
  scheduleCardSend,
} from "@/lib/card-send-schedule"
import { captureServerEvent } from "@/lib/posthog-server"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { requireServiceRoleClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const bodySchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  sendAt: z.string(),
})

type RouteContext = { params: Promise<{ id: string }> }

/** The signed-in user and their card, or why they can't act on it. */
async function ownedCard(cardId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", status: 401 } as const

  const { data: card, error } = await supabase
    .from("cards")
    .select("id, contributor_link_id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) {
    console.error("[api/cards/[id]/schedule] card lookup:", error)
    return { error: "Failed to load card", status: 500 } as const
  }
  if (!card) return { error: "Card not found", status: 404 } as const
  return { supabase, user, card } as const
}

/** Schedules (or reschedules) emailing the card to its recipient. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  // Each schedule is a future email, so it shares the send route's budget.
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:cards:schedule",
    maxRequests: 15,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimit.headers },
    )
  }

  const { id } = await params
  const owned = await ownedCard(id)
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status })
  }
  if (!owned.card.contributor_link_id) {
    return NextResponse.json(
      { error: "Card link is unavailable" },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }
  const sendAt = parseSendAt(parsed.data.sendAt)
  if (!sendAt.ok) {
    return NextResponse.json({ error: sendAt.error }, { status: 400 })
  }

  try {
    const schedule = await scheduleCardSend(requireServiceRoleClient(), {
      cardId: id,
      userId: owned.user.id,
      sendAt: sendAt.sendAt,
      recipientEmail: parsed.data.email,
    })

    // Keep the card's saved address in step, as sending now does.
    const { error: emailError } = await owned.supabase
      .from("cards")
      .update({
        recipient_email: parsed.data.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", owned.user.id)
    if (emailError) {
      console.error("[api/cards/[id]/schedule] recipient_email:", emailError)
    }

    captureServerEvent(owned.user.id, "card_send_scheduled", {
      card_id: id,
      lead_hours: Math.round(
        (sendAt.sendAt.getTime() - Date.now()) / (60 * 60 * 1000),
      ),
    })
    return NextResponse.json({ schedule })
  } catch (err) {
    console.error("[api/cards/[id]/schedule] POST:", err)
    return NextResponse.json(
      { error: "Failed to schedule the card" },
      { status: 500 },
    )
  }
}

/** Cancels a pending scheduled send. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const owned = await ownedCard(id)
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status })
  }

  try {
    const cancelled = await cancelCardSend(
      requireServiceRoleClient(),
      id,
      owned.user.id,
    )
    if (cancelled) {
      captureServerEvent(owned.user.id, "card_send_schedule_cancelled", {
        card_id: id,
      })
    }
    return NextResponse.json({ ok: true, cancelled })
  } catch (err) {
    console.error("[api/cards/[id]/schedule] DELETE:", err)
    return NextResponse.json(
      { error: "Failed to cancel the scheduled send" },
      { status: 500 },
    )
  }
}
