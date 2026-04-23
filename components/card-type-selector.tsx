"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

const CARD_TYPES = [
  {
    id: "birthday",
    label: "Birthday",
    hue: 18,
    desc: "Warm, celebratory copy. Often lands best with a signature collection.",
    tag: "Most popular",
  },
  {
    id: "thank_you",
    label: "Thank You",
    hue: 40,
    desc: "Sincere without being saccharine. Great one-sender or group.",
    tag: "Heartfelt",
  },
  {
    id: "congratulations",
    label: "Congratulations",
    hue: 70,
    desc: "Promotion, engagement, new apartment — energetic and genuine.",
    tag: "Celebratory",
  },
  {
    id: "holiday",
    label: "Holiday",
    hue: 150,
    desc: "For the annual list. Each copy can be personalized by name.",
    tag: "Seasonal",
  },
  {
    id: "custom",
    label: "Custom",
    hue: 230,
    desc: "Describe it in one sentence. We figure out the tone.",
    tag: "Flexible",
  },
]

export function CardTypeSelector({
  onSelect,
  isGuest = false,
}: {
  onSelect: (type: string) => void
  isGuest?: boolean
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10">
        <Link href={isGuest ? "/" : "/dashboard"}>
          <Button variant="outline" size="default">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            {isGuest ? "Back" : "Back to dashboard"}
          </Button>
        </Link>
      </div>
      <div className="mb-10">
        <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
          Step 1 / 3
        </p>
        <h2 className="mt-2.5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
          What kind of card?
        </h2>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          Pick an occasion to set the tone. Everything is editable — this just
          gives the AI a starting point.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_TYPES.map((cardType) => (
          <button
            key={cardType.id}
            onClick={() => onSelect(cardType.id)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
          >
            {/* Colour swatch */}
            <div
              className="mb-5 h-12 w-12 rounded-xl"
              style={{ background: `oklch(0.88 0.1 ${cardType.hue})` }}
            />
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
                {cardType.label}
              </h3>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {cardType.tag}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {cardType.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
