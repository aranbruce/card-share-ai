import { validate as isValidUuid } from "uuid"
import { requireServiceRoleClient } from "@/lib/supabase/admin"

/** Which link the preview is for: the finished card, or the page to sign it. */
export type CardPreviewVariant = "view" | "contribute"

export type CardPreviewRecord = {
  id: string
  recipient_name: string | null
  sender_name: string | null
  copy_headline: string | null
  image_url: string | null
}

export const CARD_PREVIEW_SIZE = { width: 1200, height: 630 } as const

export function parseCardPreviewVariant(
  value: string | null | undefined,
): CardPreviewVariant {
  return value === "contribute" ? "contribute" : "view"
}

export async function getCardPreviewByLinkId(
  linkId: string,
): Promise<CardPreviewRecord | null> {
  if (!isValidUuid(linkId)) return null

  const supabase = requireServiceRoleClient()
  const { data, error } = await supabase
    .from("cards")
    .select("id, recipient_name, sender_name, copy_headline, image_url")
    .eq("contributor_link_id", linkId)
    .maybeSingle()

  if (error) {
    console.error("[getCardPreviewByLinkId]", error)
    throw new Error("Failed to fetch card")
  }
  return data
}

/** Short, stable fingerprint of what the preview shows, so edits get a fresh image URL. */
export function cardPreviewVersion(
  card: Pick<
    CardPreviewRecord,
    "recipient_name" | "sender_name" | "copy_headline" | "image_url"
  >,
): string {
  const text = [
    card.recipient_name,
    card.sender_name,
    card.copy_headline,
    card.image_url,
  ]
    .map((part) => part ?? "")
    .join("\u0000")
  // FNV-1a
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Path of a card's link preview image (1200×630), relative to the app URL. */
export function cardPreviewImagePath(
  linkId: string,
  variant: CardPreviewVariant,
  card: Parameters<typeof cardPreviewVersion>[0],
): string {
  const params = new URLSearchParams({
    for: variant,
    v: cardPreviewVersion(card),
  })
  return `/og/card/${encodeURIComponent(linkId)}?${params}`
}
