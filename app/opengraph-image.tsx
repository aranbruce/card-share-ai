import { ImageResponse } from "next/og"
import {
  loadInterTight,
  OG_INTER_TIGHT_FAMILY,
} from "@/lib/og-inter-tight-font"
import { OgLogoMark } from "@/lib/og-logo-mark"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site-metadata"

export const runtime = "nodejs"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = SITE_NAME

export default async function OpenGraphImage() {
  const [regular, semiBold, bold] = await Promise.all([
    loadInterTight(400),
    loadInterTight(600),
    loadInterTight(700),
  ])

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "linear-gradient(135deg, #faf8f5 0%, #f5d4c8 55%, #e8a89a 100%)",
        fontFamily: OG_INTER_TIGHT_FAMILY,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 36,
          fontWeight: 700,
          color: "#2a2420",
        }}
      >
        <OgLogoMark size={56} />
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            color: "#1a1512",
            maxWidth: 1000,
          }}
        >
          Greeting cards, generated in seconds
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 400,
            lineHeight: 1.35,
            color: "#4a4038",
            maxWidth: 900,
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: OG_INTER_TIGHT_FAMILY,
          data: regular,
          weight: 400,
          style: "normal",
        },
        {
          name: OG_INTER_TIGHT_FAMILY,
          data: semiBold,
          weight: 600,
          style: "normal",
        },
        {
          name: OG_INTER_TIGHT_FAMILY,
          data: bold,
          weight: 700,
          style: "normal",
        },
      ],
    },
  )
}
