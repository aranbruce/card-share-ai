import type { NextRequest } from "next/server"
import {
  claimDueSends,
  deliverScheduledSend,
  type DeliveryOutcome,
} from "@/lib/card-send-schedule"
import { requireServiceRoleClient } from "@/lib/supabase/admin"

export const maxDuration = 300

/**
 * Emails every card whose scheduled send is due. Called by the Vercel cron every 5 minutes
 * (see vercel.json), which sends `Authorization: Bearer <CRON_SECRET>`. Unlike the Slack
 * warm-up cron this sends email, so without CRON_SECRET it refuses every request.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 })
  }

  const service = requireServiceRoleClient()
  const due = await claimDueSends(service)

  const outcomes: Record<DeliveryOutcome | "error", number> = {
    sent: 0,
    retry: 0,
    failed: 0,
    error: 0,
  }
  // One at a time: volumes are small, and it keeps Resend well under its rate limit.
  for (const send of due) {
    try {
      outcomes[await deliverScheduledSend(service, send)] += 1
    } catch (err) {
      // Left claimed; picked up again once the claim goes stale.
      console.error("[cron/send-scheduled]", send.card_id, err)
      outcomes.error += 1
    }
  }

  return Response.json({ due: due.length, ...outcomes })
}
