'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

const CARD_TYPES = [
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'thank_you', label: 'Thank You', icon: '🙏' },
  { id: 'congratulations', label: 'Congratulations', icon: '🎉' },
  { id: 'holiday', label: 'Holiday', icon: '🎄' },
  { id: 'custom', label: 'Custom', icon: '✨' },
]

export function CardTypeSelector({
  onSelect,
}: {
  onSelect: (type: string) => void
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="mb-10 text-center">
        <h2 className="mb-3 text-3xl font-extrabold tracking-tight">
          Create a Card
        </h2>
        <p className="text-lg text-muted-foreground">
          Choose what kind of card you&apos;d like to create
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_TYPES.map((cardType) => (
          <button
            key={cardType.id}
            onClick={() => onSelect(cardType.id)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-secondary/20 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:bg-secondary/40 hover:shadow-sm"
          >
            <div className="mb-5 text-5xl transition-transform duration-300 group-hover:scale-110">
              {cardType.icon}
            </div>
            <h3 className="text-lg font-semibold">{cardType.label}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Create a personalized {cardType.label.toLowerCase()} card
            </p>
          </button>
        ))}
      </div>

      <div className="pt-8 text-center">
        <Link href="/dashboard">
          <Button
            variant="outline"
            size="lg"
            className="border-border/50 hover:bg-secondary/50"
          >
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
