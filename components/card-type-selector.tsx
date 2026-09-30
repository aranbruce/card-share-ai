"use client"

const CARD_TYPES = [
  {
    id: "birthday",
    label: "Birthday",
    hue: 18,
    emoji: "🎂",
    desc: "Warm, upbeat copy for another trip around the sun",
    tag: "Most popular",
  },
  {
    id: "thank_you",
    label: "Thank You",
    hue: 40,
    emoji: "🙏",
    desc: "Genuine appreciation without the corporate fluff",
    tag: "Heartfelt",
  },
  {
    id: "congratulations",
    label: "Congratulations",
    hue: 70,
    emoji: "🎉",
    desc: "Celebrate promotions, engagements, new babies, and other milestones",
    tag: "Celebratory",
  },
  {
    id: "holiday",
    label: "Holiday",
    hue: 150,
    emoji: "🎄",
    desc: "Season's greetings for colleagues, clients, or your annual list",
    tag: "Seasonal",
  },
  {
    id: "sympathy",
    label: "Sympathy",
    hue: 310,
    emoji: "💐",
    desc: "Compassionate words for loss or difficult moments",
    tag: "Thoughtful",
  },
  {
    id: "custom",
    label: "Custom",
    hue: 230,
    emoji: "✏️",
    desc: "Anything else you can think of. Describe it and we'll handle the rest",
    tag: "Flexible",
  },
]

export function CardTypeSelector({
  onSelect,
}: {
  onSelect: (type: string) => void
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10">
        <h2 className="mt-2.5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
          What kind of card?
        </h2>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          Pick an occasion to set the tone. Everything is editable. This just
          gives the AI a starting point
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
              className="mb-5 flex size-12 items-center justify-center rounded-xl text-2xl"
              style={{ background: `oklch(0.88 0.1 ${cardType.hue})` }}
            >
              {cardType.emoji}
            </div>
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
