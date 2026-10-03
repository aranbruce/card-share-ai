import type { SupabaseClient } from "@supabase/supabase-js"
import { getAppUrl } from "@/lib/app-url"
import {
  sendRecipientCardEmail,
  sendScheduledSendDeliveredEmail,
  sendScheduledSendFailedEmail,
} from "@/lib/email/resend"
import { captureServerEvent } from "@/lib/posthog-server"

/**
 * Scheduled sends: the owner picks a time, contributors are asked to sign by then (signing stays open after),
 * and the cron (`app/api/cron/send-scheduled`) emails the card to the recipient then.
 * Schedules live in `card_send_schedules`, which only the service role writes.
 */

/** How far ahead a send can be scheduled. */
export const MAX_SCHEDULE_AHEAD_MS = 366 * 24 * 60 * 60 * 1000
/** Failed sends are retried on later (hourly) cron runs, up to this many attempts in all. */
export const MAX_SEND_ATTEMPTS = 3
/** A claim older than this is from a run that died, so the send is picked up again. */
const CLAIM_TIMEOUT_MS = 15 * 60 * 1000

export type CardSendScheduleState = "scheduled" | "sent" | "failed"

export type CardSendSchedule = {
  send_at: string
  recipient_email: string
  state: CardSendScheduleState
  sent_at: string | null
}

const SCHEDULE_COLUMNS = "send_at, recipient_email, state, sent_at"

export type ParsedSendAt =
  { ok: true; sendAt: Date } | { ok: false; error: string }

/** Checks a requested send time (an ISO string) is a real time in the allowed window. */
export function parseSendAt(value: unknown, now = new Date()): ParsedSendAt {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Choose when to send the card" }
  }
  const sendAt = new Date(value)
  if (Number.isNaN(sendAt.getTime())) {
    return { ok: false, error: "Choose a valid date and time" }
  }
  // The picker offers whole hours and the cron runs on the hour, so the next hour is the
  // soonest a send can go out.
  if (sendAt.getTime() <= now.getTime()) {
    return { ok: false, error: "Choose a time in the future" }
  }
  if (sendAt.getTime() > now.getTime() + MAX_SCHEDULE_AHEAD_MS) {
    return { ok: false, error: "Choose a time within the next year" }
  }
  return { ok: true, sendAt }
}

/**
 * A card's send schedule, or null when it has none. Owners can read their own with their
 * client; returns null (and logs) if the lookup fails, so pages still load.
 */
export async function getCardSendSchedule(
  supabase: SupabaseClient,
  cardId: string,
): Promise<CardSendSchedule | null> {
  const { data, error } = await supabase
    .from("card_send_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("card_id", cardId)
    .maybeSingle()
  if (error) {
    console.error("[getCardSendSchedule]", error)
    return null
  }
  return (data as CardSendSchedule | null) ?? null
}

/** Schedules (or reschedules) a card's send. `service` must be the service-role client. */
export async function scheduleCardSend(
  service: SupabaseClient,
  {
    cardId,
    userId,
    sendAt,
    recipientEmail,
  }: { cardId: string; userId: string; sendAt: Date; recipientEmail: string },
): Promise<CardSendSchedule> {
  const { data, error } = await service
    .from("card_send_schedules")
    .upsert(
      {
        card_id: cardId,
        user_id: userId,
        send_at: sendAt.toISOString(),
        recipient_email: recipientEmail,
        state: "scheduled",
        attempts: 0,
        claimed_at: null,
        sent_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "card_id" },
    )
    .select(SCHEDULE_COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return data as CardSendSchedule
}

/** Cancels a card's pending send. Returns whether there was one to cancel. */
export async function cancelCardSend(
  service: SupabaseClient,
  cardId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from("card_send_schedules")
    .delete()
    .eq("card_id", cardId)
    .eq("user_id", userId)
    .eq("state", "scheduled")
    .select("card_id")
  if (error) throw new Error(error.message)
  return (data ?? []).length > 0
}

export type DueSend = {
  card_id: string
  user_id: string
  recipient_email: string
  attempts: number
  claimed_at: string
}

/**
 * Claims every send that's due, so an overlapping cron run can't send them too: the update
 * only matches rows no other run holds, and Postgres re-checks that per row.
 */
export async function claimDueSends(
  service: SupabaseClient,
  now = new Date(),
): Promise<DueSend[]> {
  const claimedAt = now.toISOString()
  const stale = new Date(now.getTime() - CLAIM_TIMEOUT_MS).toISOString()
  const { data, error } = await service
    .from("card_send_schedules")
    .update({ claimed_at: claimedAt })
    .eq("state", "scheduled")
    .lte("send_at", claimedAt)
    .or(`claimed_at.is.null,claimed_at.lt."${stale}"`)
    .select("card_id, user_id, recipient_email, attempts, claimed_at")
  if (error) throw new Error(error.message)
  return (data ?? []) as DueSend[]
}

async function ownerEmail(
  service: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await service.auth.admin.getUserById(userId)
  if (error) {
    console.error("[scheduled-send] owner lookup:", error)
    return null
  }
  return data.user?.email ?? null
}

/**
 * Records a delivery's result, but only while this run still holds the claim: if the owner
 * rescheduled or cancelled meanwhile (which clears the claim), their change stands.
 */
async function updateClaimedSend(
  service: SupabaseClient,
  due: DueSend,
  values: Record<string, unknown>,
  what: string,
  tries = 1,
): Promise<void> {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const { error } = await service
      .from("card_send_schedules")
      .update(values)
      .eq("card_id", due.card_id)
      .eq("claimed_at", due.claimed_at)
    if (!error) return
    console.error(`[scheduled-send] ${what} (try ${attempt}):`, error)
  }
}

export type DeliveryOutcome = "sent" | "retry" | "failed"

/**
 * Emails a claimed send to the recipient and records the result: marks the card sent and
 * tells the owner, or releases it for a retry, or after the last attempt gives up and tells
 * the owner to send it by hand.
 */
export async function deliverScheduledSend(
  service: SupabaseClient,
  due: DueSend,
): Promise<DeliveryOutcome> {
  const { data: card, error: cardError } = await service
    .from("cards")
    .select("id, recipient_name, sender_name, contributor_link_id")
    .eq("id", due.card_id)
    .maybeSingle()
  if (cardError) throw new Error(cardError.message)

  const recipientName = card?.recipient_name?.trim() || "there"
  const dashboardLink = `${getAppUrl()}/dashboard/cards/${due.card_id}`

  const result = card?.contributor_link_id
    ? await sendRecipientCardEmail({
        to: due.recipient_email,
        recipientName,
        senderName: card.sender_name?.trim() || "Someone",
        link: `${getAppUrl()}/view/${card.contributor_link_id}`,
      })
    : ({ ok: false, error: "Card link is unavailable" } as const)

  const now = new Date().toISOString()

  if (result.ok) {
    // Retried once: if this write is lost, the claim goes stale and the card is emailed again.
    await updateClaimedSend(
      service,
      due,
      {
        state: "sent",
        sent_at: now,
        attempts: due.attempts + 1,
        claimed_at: null,
        last_error: null,
        updated_at: now,
      },
      "mark sent",
      2,
    )

    const { error: cardUpdateError } = await service
      .from("cards")
      .update({ sent_at: now, recipient_email: due.recipient_email })
      .eq("id", due.card_id)
      .is("sent_at", null)
    if (cardUpdateError) {
      console.error("[scheduled-send] card sent_at:", cardUpdateError)
    }

    captureServerEvent(due.user_id, "card_sent", {
      card_id: due.card_id,
      scheduled: true,
    })
    const to = await ownerEmail(service, due.user_id)
    if (to) {
      await sendScheduledSendDeliveredEmail({
        to,
        recipientName,
        link: dashboardLink,
      })
    }
    return "sent"
  }

  const attempts = due.attempts + 1
  const givingUp = attempts >= MAX_SEND_ATTEMPTS
  await updateClaimedSend(
    service,
    due,
    {
      state: givingUp ? "failed" : "scheduled",
      attempts,
      claimed_at: null,
      last_error: result.error,
      updated_at: now,
    },
    "record failure",
  )

  if (!givingUp) return "retry"

  captureServerEvent(due.user_id, "scheduled_send_failed", {
    card_id: due.card_id,
    error: result.error,
  })
  const to = await ownerEmail(service, due.user_id)
  if (to) {
    await sendScheduledSendFailedEmail({
      to,
      recipientName,
      link: dashboardLink,
    })
  }
  return "failed"
}
