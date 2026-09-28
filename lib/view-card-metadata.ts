import type { Metadata } from "next"
import {
  CARD_PREVIEW_SIZE,
  cardPreviewImagePath,
  type CardPreviewVariant,
} from "@/lib/card-preview"
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata"
import {
  getContributeCardByLinkId,
  type ContributeCardRecord,
} from "@/lib/contribute-card"
import {
  getPublicCardByLinkId,
  type PublicCardViewRecord,
} from "@/lib/public-card-view"

function shareCardTitle(
  card: PublicCardViewRecord | ContributeCardRecord,
  fallback: string,
): string {
  const headline = card.copy_headline?.trim()
  if (headline) return headline
  const recipient = card.recipient_name?.trim()
  if (recipient) return fallback.replace("{name}", () => recipient)
  return "Your greeting card"
}

function shareCardDescription(
  card: PublicCardViewRecord | ContributeCardRecord,
  intro: string,
): string {
  const recipient = card.recipient_name?.trim()
  const sender = card.sender_name?.trim()
  if (recipient) {
    return `${intro.replace("{name}", () => recipient)}${sender ? ` from ${sender}` : ""}.`
  }
  return DEFAULT_DESCRIPTION
}

function cardLinkMetadata(
  linkId: string,
  variant: CardPreviewVariant,
  card: PublicCardViewRecord | ContributeCardRecord,
  title: string,
  description: string,
): Metadata {
  const image = {
    url: cardPreviewImagePath(linkId, variant, card),
    ...CARD_PREVIEW_SIZE,
    alt: title,
  }

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export async function buildContributeCardMetadata(
  linkId: string,
): Promise<Metadata> {
  try {
    const result = await getContributeCardByLinkId(linkId)
    if (!result) {
      return {
        title: "Card not found",
        robots: { index: false, follow: false },
      }
    }

    const { card } = result
    return cardLinkMetadata(
      linkId,
      "contribute",
      card,
      shareCardTitle(card, "Sign {name}'s card"),
      shareCardDescription(
        card,
        "Add your message to the group card for {name}",
      ),
    )
  } catch {
    return {
      title: "Card unavailable",
      robots: { index: false, follow: false },
    }
  }
}

export async function buildViewCardMetadata(linkId: string): Promise<Metadata> {
  try {
    const result = await getPublicCardByLinkId(linkId)
    if (!result) {
      return {
        title: "Card not found",
        robots: { index: false, follow: false },
      }
    }

    const { card } = result
    return cardLinkMetadata(
      linkId,
      "view",
      card,
      shareCardTitle(card, "A card for {name}"),
      shareCardDescription(
        card,
        "Open a personalised greeting card for {name}",
      ),
    )
  } catch {
    return {
      title: "Card unavailable",
      robots: { index: false, follow: false },
    }
  }
}
