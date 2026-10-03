import { validate as isValidUuid } from "uuid"
import type { Contribution } from "@/lib/card-body"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "@/lib/contribution-public-columns"
import { getCardSendSchedule } from "@/lib/card-send-schedule"
import { requireServiceRoleClient } from "@/lib/supabase/admin"

export const CONTRIBUTE_CARD_SELECT =
  "id, sent_at, card_type, recipient_name, sender_name, copy_headline, copy_message, image_url, extra_pages"

export type ContributeCardRecord = {
  id: string
  sent_at: string | null
  card_type: string
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  extra_pages: number | null
  /** When the card is scheduled to be emailed to the recipient: the time to sign by (signing stays open after). */
  scheduled_send_at: string | null
}

export type ContributeCardResult = {
  card: ContributeCardRecord
  contributions: Contribution[]
}

export async function getContributeCardByLinkId(
  linkId: string,
): Promise<ContributeCardResult | null> {
  if (!isValidUuid(linkId)) return null

  const supabase = requireServiceRoleClient()

  const { data: cardData, error: cardError } = await supabase
    .from("cards")
    .select(CONTRIBUTE_CARD_SELECT)
    .eq("contributor_link_id", linkId)
    .maybeSingle()

  if (cardError) {
    console.error("[getContributeCardByLinkId] card:", cardError)
    throw new Error("Failed to fetch card")
  }

  if (!cardData) return null

  const [{ data: contributions, error: contribError }, schedule] =
    await Promise.all([
      supabase
        .from("card_contributions")
        .select(CONTRIBUTION_PUBLIC_COLUMNS)
        .eq("card_id", cardData.id)
        .order("created_at", { ascending: true }),
      getCardSendSchedule(supabase, cardData.id),
    ])
  const card: ContributeCardRecord = {
    ...cardData,
    scheduled_send_at:
      schedule?.state === "scheduled" ? schedule.send_at : null,
  }

  if (contribError) {
    console.error("[getContributeCardByLinkId] contributions:", contribError)
    return { card, contributions: [] }
  }

  return {
    card,
    contributions: (contributions ?? []) as Contribution[],
  }
}
