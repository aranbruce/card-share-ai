import { pickBySeed } from "@/lib/pick-by-seed"

/** The look of the envelope a card arrives in: paper, ink and liner. */
export type EnvelopeStyle = {
  label: string
  paper: {
    /** Base sheet (and the address side). */
    base: string
    /** Lit and shaded side flaps, the bottom flap and the top flap (gradient stops). */
    sideLit: [string, string]
    sideShaded: [string, string]
    bottom: [string, string]
    flap: [string, string]
    /** The folded edges seen side-on, and the inside of the envelope. */
    edge: string
    /** RGB of the shadows the folds cast on each other. */
    shadow: string
    /** Strength of the light catching cut edges (lower on dark paper). */
    highlight: number
  }
  ink: {
    color: string
    /** Multiply soaks dark ink into light paper; light ink on dark paper sits on top. */
    blend: GlobalCompositeOperation
  }
  liner: {
    margin: string
    base: string
    motif: string
    pattern: "hearts" | "stripes" | "stars" | "flowers"
  }
}

export const ENVELOPE_STYLES = {
  ivory: {
    label: "Ivory",
    paper: {
      base: "#f4ecdf",
      sideLit: ["#f1e8da", "#eadfcd"],
      sideShaded: ["#e6dac6", "#ece2d2"],
      bottom: ["#f0e7d9", "#f7f1e7"],
      flap: ["#f6efe3", "#ece1cf"],
      edge: "#e6d8c2",
      shadow: "70, 48, 25",
      highlight: 0.75,
    },
    ink: { color: "rgba(34, 45, 74, 0.9)", blend: "multiply" },
    liner: {
      margin: "#ece2d2",
      base: "#f2685a",
      motif: "rgba(255, 246, 240, 0.9)",
      pattern: "hearts",
    },
  },
  kraft: {
    label: "Kraft",
    paper: {
      base: "#c9a67b",
      sideLit: ["#c7a376", "#bf9a6c"],
      sideShaded: ["#b48d60", "#bc966a"],
      bottom: ["#c9a77c", "#d2b288"],
      flap: ["#d0af85", "#c19d71"],
      edge: "#b38e63",
      shadow: "60, 38, 15",
      highlight: 0.4,
    },
    ink: { color: "rgba(28, 22, 16, 0.9)", blend: "multiply" },
    liner: {
      margin: "#c19d71",
      base: "#f4ede0",
      motif: "rgba(38, 64, 52, 0.55)",
      pattern: "stripes",
    },
  },
  midnight: {
    label: "Midnight",
    paper: {
      base: "#222e4a",
      sideLit: ["#263352", "#202b45"],
      sideShaded: ["#1b253c", "#212c47"],
      bottom: ["#273556", "#2c3b5e"],
      flap: ["#2b3a5c", "#202b46"],
      edge: "#1a2339",
      shadow: "0, 0, 10",
      highlight: 0.22,
    },
    ink: { color: "rgba(228, 197, 128, 0.95)", blend: "source-over" },
    liner: {
      margin: "#202b46",
      base: "#121a2c",
      motif: "rgba(228, 197, 128, 0.85)",
      pattern: "stars",
    },
  },
  blush: {
    label: "Blush",
    paper: {
      base: "#f3dad4",
      sideLit: ["#f1d4cd", "#ebcac2"],
      sideShaded: ["#e5c0b8", "#ebcbc3"],
      bottom: ["#f4ded9", "#f8e8e4"],
      flap: ["#f6e1dc", "#ecc9c1"],
      edge: "#e2beb5",
      shadow: "120, 60, 50",
      highlight: 0.6,
    },
    ink: { color: "rgba(104, 36, 48, 0.9)", blend: "multiply" },
    liner: {
      margin: "#ecc9c1",
      base: "#fbf4ee",
      motif: "rgba(186, 86, 98, 0.65)",
      pattern: "flowers",
    },
  },
} satisfies Record<string, EnvelopeStyle>

export type EnvelopeStyleId = keyof typeof ENVELOPE_STYLES

export const DEFAULT_ENVELOPE_STYLE: EnvelopeStyleId = "ivory"

/** A card's envelope: one of the styles at random, but always the same one for that card. */
export function envelopeStyleForCard(linkId: string): EnvelopeStyleId {
  return pickBySeed(linkId, Object.keys(ENVELOPE_STYLES) as EnvelopeStyleId[])
}
