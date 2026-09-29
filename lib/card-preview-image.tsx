import { ImageResponse } from "next/og"
import { CARD_PREVIEW_SIZE, type CardPreviewVariant } from "@/lib/card-preview"
import { pastelHueFor, pastelStops } from "@/lib/card-pastel"
import {
  loadInterTight,
  OG_INTER_TIGHT_FAMILY,
} from "@/lib/og-inter-tight-font"
import { OgLogoMark } from "@/lib/og-logo-mark"
import { decodePngRgba, encodePngRgba } from "@/lib/png-rgba"
import { renderCardScene } from "@/lib/card-preview-scene"
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
  /** Text beside the card, in place of the card-link copy (e.g. for an occasion page). */
  copy?: { title: string; subtitle: string }
}

/** The cover drawn when a card has no image, and its hue (OKLCH, midway between its stops)
 * so the backdrop can keep clear of it. */
const FALLBACK_COVER = "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)"
const FALLBACK_COVER_HUE = 60

/** The card front is laid out at twice its shown size, so the warp has detail to sample. */
const FACE_SCALE = 2
const FACE_WIDTH = 400 * FACE_SCALE
const FACE_HEIGHT = 500 * FACE_SCALE

/** The space the card (turned, open a little) is fitted into, right of the text. */
const CARD_AREA = { right: 1090, width: 480, height: 510 }

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

type OgFonts = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"]

async function loadFonts(): Promise<OgFonts> {
  const [regular, semiBold, bold] = await Promise.all([
    loadInterTight(400),
    loadInterTight(600),
    loadInterTight(700),
  ])
  return [
    { name: OG_INTER_TIGHT_FAMILY, data: regular, weight: 400 },
    { name: OG_INTER_TIGHT_FAMILY, data: semiBold, weight: 600 },
    { name: OG_INTER_TIGHT_FAMILY, data: bold, weight: 700 },
  ]
}

/**
 * The card's front, flat, as the 3D card paints it: cover art, a dark fade, the title and
 * the gloss of the cover stock.
 */
async function renderCardFace(
  cover: string | null,
  headline: string,
  recipientName: string,
  fonts: OgFonts,
): Promise<Uint8Array> {
  const s = FACE_SCALE
  const face = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: FALLBACK_COVER,
        fontFamily: OG_INTER_TIGHT_FAMILY,
      }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
        <img
          src={cover}
          alt=""
          width={FACE_WIDTH}
          height={FACE_HEIGHT}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: FACE_WIDTH,
            height: FACE_HEIGHT,
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: FACE_WIDTH,
          height: FACE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: 26 * s,
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {headline ? (
          <div
            style={{
              fontSize: 32 * s,
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
              marginTop: 8 * s,
              fontSize: 17 * s,
              fontWeight: 400,
              opacity: 0.8,
            }}
          >
            {`For ${recipientName}`}
          </div>
        ) : null}
      </div>
      {/* Gloss: light catching the cover from the top left. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: FACE_WIDTH,
          height: FACE_HEIGHT,
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0) 55%)",
        }}
      />
    </div>,
    { width: FACE_WIDTH, height: FACE_HEIGHT, fonts },
  )
  return new Uint8Array(await face.arrayBuffer())
}

/** The card as a 3D scene (see `renderCardScene`), as a PNG data URL at FACE_SCALE. */
async function renderCard3D(
  input: CardPreviewImageInput,
  recipientName: string,
  fonts: OgFonts,
) {
  const flat = await renderCardFace(
    input.cover,
    clip(input.headline ?? "", 70),
    recipientName,
    fonts,
  )
  const scene = renderCardScene(
    decodePngRgba(flat),
    CARD_AREA.width * FACE_SCALE,
    CARD_AREA.height * FACE_SCALE,
  )
  return {
    src: `data:image/png;base64,${Buffer.from(encodePngRgba(scene.image)).toString("base64")}`,
    width: scene.image.width / FACE_SCALE,
    height: scene.image.height / FACE_SCALE,
    card: {
      x: scene.card.x / FACE_SCALE,
      y: scene.card.y / FACE_SCALE,
      width: scene.card.width / FACE_SCALE,
      height: scene.card.height / FACE_SCALE,
    },
  }
}

/**
 * A card's link preview (1200×630) for Slack, iMessage and social unfurls: the card's front
 * as the 3D card shows it (a little open, lit and casting a shadow), on its pastel
 * backdrop, with what the link is for beside it.
 */
export async function renderCardPreviewImage(
  input: CardPreviewImageInput,
): Promise<ImageResponse> {
  const fonts = await loadFonts()
  const { light, deep } = pastelStops(
    pastelHueFor(input.id, input.cover ? null : FALLBACK_COVER_HUE),
  )
  const recipient = clip(input.recipientName ?? "", 40)
  const { title, subtitle } =
    input.copy ??
    cardPreviewCopy(
      input.variant,
      recipient || null,
      clip(input.senderName ?? "", 40) || null,
    )
  const shownTitle = clip(title, 56)
  const card = await renderCard3D(input, recipient, fonts)
  // Right-align the card itself (not its shadow) in its area, centred vertically.
  const cardLeft = CARD_AREA.right - card.card.width - card.card.x
  const cardTop =
    (CARD_PREVIEW_SIZE.height - card.card.height) / 2 - card.card.y

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundImage: `linear-gradient(135deg, ${light}, ${deep})`,
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

      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
      <img
        src={card.src}
        alt=""
        width={card.width}
        height={card.height}
        style={{
          position: "absolute",
          left: cardLeft,
          top: cardTop,
          width: card.width,
          height: card.height,
        }}
      />
    </div>,
    { ...CARD_PREVIEW_SIZE, fonts },
  )
}
