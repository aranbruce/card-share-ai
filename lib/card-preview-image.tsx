import { ImageResponse } from "next/og"
import { CARD_PREVIEW_SIZE, type CardPreviewVariant } from "@/lib/card-preview"
import { pastelHueFor, pastelStops } from "@/lib/card-pastel"
import {
  loadInterTight,
  OG_INTER_TIGHT_FAMILY,
} from "@/lib/og-inter-tight-font"
import { OgLogoMark } from "@/lib/og-logo-mark"
import { SITE_NAME } from "@/lib/site-metadata"

export type CardPreviewImageInput = {
  /** Picks the card's pastel backdrop (the same card always gets the same one). */
  id: string
  variant: CardPreviewVariant
  recipientName: string | null
  senderName: string | null
  headline: string | null
  /** The cover as a data URL the renderer can draw, or null for the fallback gradient. */
  cover: string | null
}

const CARD_WIDTH = 400
const CARD_HEIGHT = 500

function clip(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length > max
    ? `${trimmed.slice(0, max - 1).trimEnd()}…`
    : trimmed
}

/** What the preview says beside the card, for the finished card or the page to sign it. */
export function cardPreviewCopy(
  variant: CardPreviewVariant,
  recipientName: string | null,
  senderName: string | null,
): { title: string; subtitle: string } {
  const recipient = recipientName?.trim()
  const sender = senderName?.trim()
  if (variant === "contribute") {
    return {
      title: recipient ? `Sign ${recipient}'s card` : "Sign the group card",
      subtitle: "Add your message to the group card",
    }
  }
  return {
    title: recipient ? `A card for ${recipient}` : "A card for you",
    subtitle: sender ? `From ${sender}` : "Open it to read the messages inside",
  }
}

function titleFontSize(title: string): number {
  if (title.length <= 18) return 76
  if (title.length <= 28) return 64
  return 52
}

/** The card's front, as the 3D card paints it: cover art, a dark fade and the title. */
function CardFront({
  cover,
  headline,
  recipientName,
}: {
  cover: string | null
  headline: string
  recipientName: string
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
        boxShadow:
          "0 40px 70px rgba(70, 35, 20, 0.28), 0 8px 18px rgba(70, 35, 20, 0.16)",
        transform: "rotate(4deg)",
      }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
        <img
          src={cover}
          alt=""
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: 26,
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {headline ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {headline}
          </div>
        ) : null}
        {recipientName ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 17,
              fontWeight: 400,
              opacity: 0.8,
            }}
          >
            {`For ${recipientName}`}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * A card's link preview (1200×630) for Slack, iMessage and social unfurls: the card's
 * front, tilted over an open inside page, on its pastel backdrop, with what the link is for.
 */
export async function renderCardPreviewImage(
  input: CardPreviewImageInput,
): Promise<ImageResponse> {
  const [regular, semiBold, bold] = await Promise.all([
    loadInterTight(400),
    loadInterTight(600),
    loadInterTight(700),
  ])

  const { light, deep } = pastelStops(pastelHueFor(input.id))
  const recipient = clip(input.recipientName ?? "", 40)
  const { title, subtitle } = cardPreviewCopy(
    input.variant,
    recipient || null,
    clip(input.senderName ?? "", 40) || null,
  )
  const shownTitle = clip(title, 56)

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundImage: `radial-gradient(circle at 75% 20%, ${light} 0%, ${deep} 85%)`,
        fontFamily: OG_INTER_TIGHT_FAMILY,
      }}
    >
      <div
        style={{
          width: 640,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 0 80px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 30,
            fontWeight: 700,
            color: "#2a2420",
          }}
        >
          <OgLogoMark size={48} />
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: titleFontSize(shownTitle),
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#1a1512",
            }}
          >
            {shownTitle}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 400,
              lineHeight: 1.3,
              color: "#4a4038",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 700,
          top: 64,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
        }}
      >
        {/* An inside page peeking out behind the front, so it reads as a card. */}
        <div
          style={{
            position: "absolute",
            left: -34,
            top: 10,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            display: "flex",
            borderRadius: 18,
            background: "linear-gradient(160deg, #fffdf9 0%, #f4efe7 100%)",
            boxShadow: "0 24px 50px rgba(70, 35, 20, 0.18)",
            transform: "rotate(-5deg)",
          }}
        />
        <CardFront
          cover={input.cover}
          headline={clip(input.headline ?? "", 70)}
          recipientName={recipient}
        />
      </div>
    </div>,
    {
      ...CARD_PREVIEW_SIZE,
      fonts: [
        { name: OG_INTER_TIGHT_FAMILY, data: regular, weight: 400 },
        { name: OG_INTER_TIGHT_FAMILY, data: semiBold, weight: 600 },
        { name: OG_INTER_TIGHT_FAMILY, data: bold, weight: 700 },
      ],
    },
  )
}
