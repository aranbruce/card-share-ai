export type CardOccasion = {
  /** Stored as the card's `card_type`. */
  id: string
  label: string
  desc: string
  /** Example cover shown in the picker and preview; Custom has none. */
  cover: string | null
  /** Colour of the cover placeholders while there's no cover yet. */
  hue: number
}

/** The occasions offered when creating a card, in display order. */
export const CARD_OCCASIONS: CardOccasion[] = [
  {
    id: "birthday",
    hue: 18,
    label: "Birthday",
    desc: "Warm, upbeat copy for another trip around the sun",
    cover: "/occasions/birthday.webp",
  },
  {
    id: "thank_you",
    hue: 40,
    label: "Thank You",
    desc: "Genuine appreciation without the corporate fluff",
    cover: "/occasions/thank-you.webp",
  },
  {
    id: "congratulations",
    hue: 70,
    label: "Congratulations",
    desc: "Celebrate promotions, engagements, new babies, and other milestones",
    cover: "/occasions/promotion.webp",
  },
  {
    id: "holiday",
    hue: 150,
    label: "Holiday",
    desc: "Season's greetings for colleagues, clients, or your annual list",
    cover: "/occasions/holiday.webp",
  },
  {
    id: "sympathy",
    hue: 310,
    label: "Sympathy",
    desc: "Compassionate words for loss or difficult moments",
    cover: "/occasions/sympathy.webp",
  },
  {
    id: "custom",
    hue: 25,
    label: "Custom",
    desc: "Anything else you can think of. Describe it and we'll handle the rest",
    cover: null,
  },
]

export const DEFAULT_CARD_OCCASION = "birthday"

export function getCardOccasion(id: string): CardOccasion | undefined {
  return CARD_OCCASIONS.find((o) => o.id === id)
}

/** The gradient the studio uses for a cover placeholder (see `CardLoading3D`). */
export function coverPlaceholderGradient(hue: number): string {
  return `linear-gradient(135deg, oklch(0.9 0.08 ${hue}) 0%, oklch(0.76 0.13 ${hue - 15}) 100%)`
}
