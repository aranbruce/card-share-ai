import { cardPreviewImagePath } from "@/lib/card-preview"

/** Card fields the MCP tools read back from the `cards` table. */
export type McpCardRow = {
  id: string
  card_type?: string | null
  recipient_name?: string | null
  sender_name?: string | null
  copy_headline?: string | null
  copy_message?: string | null
  image_url?: string | null
  contributor_link_id?: string | null
  sent_at?: string | null
  created_at?: string | null
}

export const MCP_CARD_COLUMNS =
  "id, card_type, recipient_name, sender_name, copy_headline, copy_message, image_url, contributor_link_id, sent_at, created_at"

export type McpCardSummary = {
  id: string
  cardType: string
  recipientName: string
  senderName: string
  headline: string
  /** The author's own note inside the card (empty until they write one). */
  myMessage: string
  coverImageUrl: string | null
  /** The card's front on a pastel backdrop (1200×630), served by this app. */
  previewImageUrl: string | null
  status: "collecting" | "sent"
  sentAt: string | null
  createdAt: string | null
  /** Where the owner edits the card and places their own message. */
  editUrl: string
  /** Share with the group so they can sign the card. */
  contributeUrl: string | null
  /** The finished card, for the recipient. */
  viewUrl: string | null
  /** People who have signed: written a note or added a GIF, the author included. */
  signedCount?: number
}

export function summarizeCard(
  appUrl: string,
  card: McpCardRow,
  signedCount?: number,
): McpCardSummary {
  const linkId = card.contributor_link_id || null
  return {
    id: card.id,
    cardType: card.card_type || "custom",
    recipientName: card.recipient_name || "",
    senderName: card.sender_name || "",
    headline: card.copy_headline || "",
    myMessage: card.copy_message || "",
    coverImageUrl: card.image_url?.startsWith("https://")
      ? card.image_url
      : null,
    previewImageUrl: linkId
      ? `${appUrl}${cardPreviewImagePath(linkId, "view", {
          recipient_name: card.recipient_name ?? null,
          sender_name: card.sender_name ?? null,
          copy_headline: card.copy_headline ?? null,
          image_url: card.image_url ?? null,
        })}`
      : null,
    status: card.sent_at ? "sent" : "collecting",
    sentAt: card.sent_at ?? null,
    createdAt: card.created_at ?? null,
    editUrl: `${appUrl}/dashboard/cards/${card.id}`,
    contributeUrl: linkId ? `${appUrl}/contribute/${linkId}` : null,
    viewUrl: linkId ? `${appUrl}/view/${linkId}` : null,
    ...(signedCount === undefined ? {} : { signedCount }),
  }
}

/** Plain-text version of a card for clients that ignore structured content. */
export function formatCardText(card: McpCardSummary): string {
  const lines = [
    `Card for ${card.recipientName || "someone"} from ${card.senderName || "you"} (${card.cardType.replace(/_/g, " ")})`,
    card.headline ? `Headline: "${card.headline}"` : null,
    `Status: ${card.status === "sent" ? `sent ${card.sentAt}` : "collecting messages"}`,
    card.signedCount === undefined ? null : `Signed by: ${card.signedCount}`,
    `Your message: ${card.myMessage ? `"${card.myMessage}"` : "(not written yet)"}`,
    `Edit: ${card.editUrl}`,
    card.contributeUrl ? `Invite others to sign: ${card.contributeUrl}` : null,
    card.viewUrl ? `Recipient view: ${card.viewUrl}` : null,
  ]
  return lines.filter(Boolean).join("\n")
}
