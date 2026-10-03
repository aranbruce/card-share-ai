import type { CardPreviewVariant } from "@/lib/card-preview"
import { pastelHueFor, pastelStops } from "@/lib/card-pastel"
import {
  CardBack,
  CardFront,
  clip,
  OgPreviewFrame,
  renderOgPreview,
} from "@/lib/og-preview"

export type CardPreviewImageInput = {
  /** Picks the card's pastel backdrop (the same card always gets the same one). */
  id: string
  variant: CardPreviewVariant
  recipientName: string | null
  headline: string | null
  /** The cover as a data URL the renderer can draw, or null for the fallback gradient. */
  cover: string | null
}

/** Hue (OKLCH) of the fallback cover, so the backdrop can keep clear of it. */
const FALLBACK_COVER_HUE = 60

/** Shadows on the pastel panel: a cool, deep tint that reads on every hue. */
const PASTEL_SHADOW = {
  far: "rgba(20,30,70,0.55)",
  near: "rgba(20,30,70,0.12)",
}

/** What the preview says beside the card, for the finished card or the page to sign it. */
export function cardPreviewTitle(
  variant: CardPreviewVariant,
  recipientName: string | null,
): string {
  const recipient = recipientName?.trim()
  if (variant === "contribute") {
    return recipient ? `Sign ${recipient}'s card` : "Sign the group card"
  }
  return recipient ? `A card for ${recipient}` : "A card for you"
}

/**
 * A card's link preview (1200×630) for Slack, iMessage and social unfurls: the card's front
 * on its pastel panel, open a little for the finished card, with what the link is for beside
 * it.
 */
export async function renderCardPreviewImage(
  input: CardPreviewImageInput,
): Promise<Response> {
  const { light, deep } = pastelStops(
    pastelHueFor(input.id, input.cover ? null : FALLBACK_COVER_HUE),
  )
  const recipient = clip(input.recipientName ?? "", 40)
  const open = input.variant === "view"

  return renderOgPreview(
    <OgPreviewFrame
      title={cardPreviewTitle(input.variant, recipient || null)}
      panelBackground={`linear-gradient(135deg, ${light}, ${deep})`}
    >
      {open ? <CardBack shadow="rgba(20,30,70,0.45)" /> : null}
      <CardFront
        cover={input.cover}
        headline={clip(input.headline ?? "", 70)}
        recipientName={recipient}
        left={open ? 118 : 99}
        top={open ? 82 : 85}
        shadow={PASTEL_SHADOW}
      />
    </OgPreviewFrame>,
  )
}
