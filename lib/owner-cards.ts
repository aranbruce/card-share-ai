import type { SupabaseClient } from "@supabase/supabase-js"
import { validate as isValidUuid } from "uuid"
import { CONTRIBUTION_PUBLIC_COLUMNS } from "@/lib/contribution-public-columns"
import {
  normalizeStoredExtraPages,
  ownerExtraPagesForStudio,
} from "@/lib/card-extra-pages"
import type { ApiContribution } from "@/lib/contribution-layout"
import {
  getCardSendSchedule,
  type CardSendSchedule,
} from "@/lib/card-send-schedule"

export type OwnerCardListItem = {
  id: string
  recipient_name: string
  sender_name: string
  card_type: string
  copy_headline: string
  image_url: string
  created_at: string
}

const OWNER_CARD_LIST_COLUMNS =
  "id, recipient_name, sender_name, card_type, copy_headline, image_url, created_at"

const OWNER_CARD_DETAIL_COLUMNS =
  "id, card_type, recipient_name, recipient_email, sender_name, copy_headline, copy_message, image_url, extra_pages, sent_at, contributor_link_id"

export type OwnerCardDetailCard = {
  id: string
  card_type?: string
  recipient_name: string
  recipient_email?: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  extra_pages?: number
  sent_at?: string | null
  contributor_link_id: string
}

export type OwnerCardDetail = {
  card: OwnerCardDetailCard
  /** When the card is scheduled to be emailed to the recipient, if it is. */
  sendSchedule: CardSendSchedule | null
  contributions: ApiContribution[]
  contributionsLoaded: boolean
  displayExtraPages: number
  unusedExtraPagesDetected: boolean
}

export async function listOwnerCards(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnerCardListItem[]> {
  const { data, error } = await supabase
    .from("cards")
    .select(OWNER_CARD_LIST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as OwnerCardListItem[]
}

export async function getOwnerCardDetail(
  supabase: SupabaseClient,
  userId: string,
  cardId: string,
): Promise<OwnerCardDetail | null> {
  if (!isValidUuid(cardId)) return null

  const { data, error } = await supabase
    .from("cards")
    .select(OWNER_CARD_DETAIL_COLUMNS)
    .eq("id", cardId)
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(error.message)
  }

  const [{ data: contributions, error: contribErr }, sendSchedule] =
    await Promise.all([
      supabase
        .from("card_contributions")
        .select(CONTRIBUTION_PUBLIC_COLUMNS)
        .eq("card_id", cardId)
        .order("created_at", { ascending: true }),
      getCardSendSchedule(supabase, cardId),
    ])

  const card = {
    ...data,
    extra_pages: normalizeStoredExtraPages(data.extra_pages),
  } as OwnerCardDetailCard

  if (contribErr) {
    console.error("[getOwnerCardDetail] contributions:", contribErr)
    return {
      card,
      sendSchedule,
      contributions: [],
      contributionsLoaded: false,
      displayExtraPages: card.extra_pages ?? 0,
      unusedExtraPagesDetected: false,
    }
  }

  const rows = (contributions ?? []) as ApiContribution[]
  const { displayExtraPages, unusedExtraPagesDetected } =
    ownerExtraPagesForStudio(card.extra_pages ?? 0, rows, true)

  return {
    card,
    sendSchedule,
    contributions: rows,
    contributionsLoaded: true,
    displayExtraPages,
    unusedExtraPagesDetected,
  }
}
