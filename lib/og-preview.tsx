import { readFile } from "node:fs/promises"
import path from "node:path"
import type { ReactElement, ReactNode } from "react"
import { ImageResponse } from "next/og"
import sharp from "sharp"
import { CARD_PREVIEW_SIZE } from "@/lib/card-preview"
import { CARD_TONES, DEFAULT_CARD_TONE } from "@/lib/card-tones"
import {
  loadGoogleFont,
  loadInterTight,
  OG_INTER_TIGHT_FAMILY,
} from "@/lib/og-inter-tight-font"
import { OgLogoMark } from "@/lib/og-logo-mark"
import { SITE_NAME } from "@/lib/site-metadata"

/**
 * Link previews (1200×630) for shared links: the title on warm off-white, with imagery in
 * a rounded panel on the right ("Cream with a coral panel" in the OG Images design).
 */

const MONO_FAMILY = "JetBrains Mono"

/**
 * Previews are sent as JPEG: as PNGs the cover art makes them ~500 KB, and WhatsApp drops
 * images much over 300 KB and shows the link without one.
 */
const JPEG_QUALITY = 82

/** The panel's box on the 1200×630 canvas. */
export const PANEL = { left: 648, top: 24, width: 528, height: 582 }

export const CORAL = "#ff5a4a"
export const PANEL_CORAL = "#f07563"
const INK = "#1a1512"
const BORDER = "#e8e5df"
const MUTED = "#5f5d5b"
const SOFT_BG = "#f8f6f2"
/** Shadow under cards and mock-ups on the coral panel. */
const CORAL_SHADOW = "rgba(90,15,5,0.6)"

type OgFonts = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"]

async function loadFonts(): Promise<OgFonts> {
  const [regular, medium, semiBold, bold, mono] = await Promise.all([
    loadInterTight(400),
    loadInterTight(500),
    loadInterTight(600),
    loadInterTight(700),
    loadGoogleFont(MONO_FAMILY, 400),
  ])
  return [
    { name: OG_INTER_TIGHT_FAMILY, data: regular, weight: 400 },
    { name: OG_INTER_TIGHT_FAMILY, data: medium, weight: 500 },
    { name: OG_INTER_TIGHT_FAMILY, data: semiBold, weight: 600 },
    { name: OG_INTER_TIGHT_FAMILY, data: bold, weight: 700 },
    { name: MONO_FAMILY, data: mono, weight: 400 },
  ]
}

export function clip(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length > max
    ? `${trimmed.slice(0, max - 1).trimEnd()}…`
    : trimmed
}

/**
 * An image from `public/` (e.g. `/occasions/birthday.webp`) as a JPEG data URL the
 * renderer can draw (Satori can't read WebP), at twice the size it's shown, or null if it
 * can't be read.
 */
export async function loadPublicImage(
  publicPath: string | null | undefined,
  width: number,
  height: number,
): Promise<string | null> {
  if (!publicPath?.startsWith("/") || publicPath.includes("..")) return null
  try {
    const file = path.join(process.cwd(), "public", publicPath)
    const jpeg = await sharp(await readFile(file))
      .resize(width * 2, height * 2, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`
  } catch (err) {
    console.error("[og] image FAIL:", publicPath, err)
    return null
  }
}

/** Renders a preview to a JPEG response. */
export async function renderOgPreview(
  element: ReactElement,
): Promise<Response> {
  const png = new ImageResponse(element, {
    ...CARD_PREVIEW_SIZE,
    fonts: await loadFonts(),
  })
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer()
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg" },
  })
}

/**
 * Title size: as large as the text column allows. The title is all the preview says, since
 * apps show the page's title and description as text beside it.
 */
function titleSize(title: string): number {
  if (title.length <= 20) return 84
  if (title.length <= 30) return 76
  if (title.length <= 44) return 68
  return 58
}

/** The preview's frame: the logo and title on the left, the panel on the right. */
export function OgPreviewFrame({
  title,
  panelBackground = PANEL_CORAL,
  children,
}: {
  title: string
  panelBackground?: string
  children: ReactNode
}) {
  const shownTitle = clip(title, 64)
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#faf8f5",
        fontFamily: OG_INTER_TIGHT_FAMILY,
        color: "#111110",
      }}
    >
      <div
        style={{
          position: "absolute",
          ...PANEL,
          borderRadius: 28,
          overflow: "hidden",
          display: "flex",
          ...(panelBackground.includes("gradient")
            ? { backgroundImage: panelBackground }
            : { background: panelBackground }),
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 72,
          bottom: 80,
          width: 520,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
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
            letterSpacing: "-0.02em",
          }}
        >
          <OgLogoMark size={48} />
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: titleSize(shownTitle),
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.04,
            color: INK,
          }}
        >
          {shownTitle}
        </div>
      </div>
    </div>
  )
}

export type PlacedImage = {
  src: string | null
  left: number
  top: number
  width: number
  height: number
  rotate: number
}

/** Card covers laid out on the panel, later ones on top. */
export function CoverFan({ covers }: { covers: PlacedImage[] }) {
  return (
    <>
      {covers.map((cover, i) =>
        cover.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
          <img
            key={i}
            src={cover.src}
            alt=""
            width={cover.width}
            height={cover.height}
            style={{
              position: "absolute",
              left: cover.left,
              top: cover.top,
              width: cover.width,
              height: cover.height,
              objectFit: "cover",
              borderRadius: "6px 12px 12px 6px",
              transform: `rotate(${cover.rotate}deg)`,
              boxShadow: `0 34px 50px -26px ${CORAL_SHADOW}`,
            }}
          />
        ) : null,
      )}
    </>
  )
}

/** The front of a card as the card view paints it: cover, a dark fade, headline and gloss. */
export function CardFront({
  cover,
  headline,
  recipientName,
  left,
  top,
  shadow,
}: {
  /** A data URL, or null for the fallback gradient. */
  cover: string | null
  headline: string
  recipientName: string
  left: number
  top: number
  /** Shadow colour, tinted to the backdrop. */
  shadow: { far: string; near: string }
}) {
  const width = 330
  const height = 412
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        display: "flex",
        borderRadius: "6px 14px 14px 6px",
        overflow: "hidden",
        transform: "rotate(4deg)",
        background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
        boxShadow: `0 40px 60px -30px ${shadow.far}, 0 4px 10px ${shadow.near}`,
      }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
        <img
          src={cover}
          alt=""
          width={width}
          height={height}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height,
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: 24,
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {headline ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {headline}
          </div>
        ) : null}
        {recipientName ? (
          <div style={{ marginTop: 6, fontSize: 15, color: "#e6e3df" }}>
            {`For ${recipientName}`}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0) 55%)",
        }}
      />
    </div>
  )
}

/** The inside page peeking out behind an open card. */
export function CardBack({ shadow }: { shadow: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 92,
        width: 330,
        height: 412,
        borderRadius: "14px 6px 6px 14px",
        background: "#fbf8f2",
        transform: "rotate(-4deg)",
        boxShadow: `0 40px 60px -30px ${shadow}`,
      }}
    />
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 15, fontWeight: 500, color: MUTED }}>
        {label}
      </span>
      <div
        style={{
          height: 42,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderRadius: 10,
          border: `1px solid ${BORDER}`,
          background: SOFT_BG,
          fontSize: 17,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Chip({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 15,
        fontWeight: 500,
        ...(selected
          ? { background: "#111110", color: "#fafaf7" }
          : { border: `1px solid ${BORDER}`, color: MUTED }),
      }}
    >
      {label}
    </span>
  )
}

/** The finished card in the create page mock. */
export const CREATE_CARD = { width: 180, height: 225 }

/** The create page in a browser window, with a finished card beside the form. */
export function CreatePageMock({ card }: { card: string | null }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        top: 76,
        width: 560,
        height: 430,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: `0 50px 80px -40px ${CORAL_SHADOW}`,
      }}
    >
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 14px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: "#e4e1da",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            padding: "3px 12px",
            borderRadius: 6,
            background: SOFT_BG,
            fontFamily: MONO_FAMILY,
            fontSize: 11,
            color: MUTED,
          }}
        >
          cardshare.ai/create
        </div>
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        <div
          style={{
            width: 240,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: 18,
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          <Field label="To" value="Mira" />
          <Field label="From" value="The design team" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: MUTED }}>
              Tone
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CARD_TONES.map((tone) => (
                <Chip
                  key={tone}
                  label={tone}
                  selected={tone === DEFAULT_CARD_TONE}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: "auto",
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: CORAL,
              color: "#fff",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Generate card
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            // The window runs off the panel; keep the card in the part that shows
            paddingLeft: 32,
            background: SOFT_BG,
          }}
        >
          {card ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
            <img
              src={card}
              alt=""
              width={CREATE_CARD.width}
              height={CREATE_CARD.height}
              style={{
                ...CREATE_CARD,
                objectFit: "cover",
                borderRadius: "4px 12px 12px 4px",
                transform: "rotate(-3deg)",
                boxShadow: "0 30px 50px -28px rgba(40,24,10,0.5)",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** A Slack message from the app, with the card to sign. */
export function SlackMessageMock({ card }: { card: string | null }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        top: 96,
        width: 540,
        height: 390,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: `0 50px 80px -40px ${CORAL_SHADOW}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: `1px solid ${BORDER}`,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        # design-team
      </div>
      <div style={{ display: "flex", gap: 12, padding: 20 }}>
        <OgLogoMark size={40} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{SITE_NAME}</span>
            <span
              style={{
                padding: "1px 5px",
                borderRadius: 4,
                background: "#efece6",
                fontSize: 10,
                fontWeight: 600,
                color: MUTED,
              }}
            >
              APP
            </span>
            <span style={{ fontSize: 12, color: "#8a8784" }}>10:42</span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.45, width: 400 }}>
            Priya&apos;s birthday card is ready. Add your message before Friday.
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 14,
              padding: 12,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              width: 380,
            }}
          >
            {card ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
              <img
                src={card}
                alt=""
                width={96}
                height={120}
                style={{
                  width: 96,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: "4px 10px 10px 4px",
                }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                paddingTop: 4,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                Happy birthday, Priya
              </span>
              <span style={{ fontSize: 13, color: MUTED }}>
                From the Design team
              </span>
              <span
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  background: CORAL,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Sign the card
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function Reminder({
  icon,
  iconBackground,
  iconColor,
  background,
  title,
  detail,
  detailColor,
  action,
}: {
  icon: ReactNode
  iconBackground: string
  iconColor: string
  background: string
  title: string
  detail: string
  detailColor: string
  action?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        background,
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 11,
          background: iconBackground,
          color: iconColor,
        }}
      >
        {icon}
      </span>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}
      >
        <span style={{ fontSize: 17, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 14, color: detailColor }}>{detail}</span>
      </div>
      {action ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            height: 36,
            padding: "0 13px",
            borderRadius: 8,
            background: CORAL,
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {action}
        </span>
      ) : null}
    </div>
  )
}

/** Upcoming birthdays and anniversaries, as the Teams reminders show them. */
export function TeamRemindersMock() {
  return (
    <div
      style={{
        position: "absolute",
        left: 36,
        top: 150,
        // Inset on both sides (the design bleeds off the panel, which cut off "Start card")
        width: PANEL.width - 72,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Reminder
        icon={<BellIcon />}
        iconBackground="#ffe8e4"
        iconColor={CORAL}
        background="#fff"
        title="Priya's birthday is next Friday"
        detail="7 days to go · 14 people on Design"
        detailColor={MUTED}
        action="Start card"
      />
      <Reminder
        icon={<CalendarIcon />}
        iconBackground="#ebe9e3"
        iconColor={MUTED}
        background="#d9d6d0"
        title="Tom's 5-year anniversary"
        detail="In 12 days · Reminder on Monday"
        detailColor="#4a4846"
      />
      <Reminder
        icon={<CalendarIcon />}
        iconBackground="#c2bfb9"
        iconColor="#3a3836"
        background="#a9a6a0"
        title="Jonas's birthday"
        detail="In 18 days"
        detailColor="#2e2c2a"
      />
    </div>
  )
}
