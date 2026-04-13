'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const CARD_TYPES = [
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'thank_you', label: 'Thank You', icon: '🙏' },
  { id: 'congratulations', label: 'Congratulations', icon: '🎉' },
  { id: 'holiday', label: 'Holiday', icon: '🎄' },
  { id: 'custom', label: 'Custom', icon: '✨' },
]

export function CardTypeSelector({ onSelect }: { onSelect: (type: string) => void }) {
  const router = useRouter()

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold mb-3 tracking-tight">Create a Card</h2>
        <p className="text-lg text-muted-foreground">
          Choose what kind of card you&apos;d like to create
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARD_TYPES.map((cardType) => (
          <button
            key={cardType.id}
            onClick={() => onSelect(cardType.id)}
            className="group relative overflow-hidden rounded-3xl border border-border/40 bg-secondary/20 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm hover:bg-secondary/40 hover:border-border/60 cursor-pointer text-center"
          >
            <div className="text-5xl mb-5 transition-transform duration-300 group-hover:scale-110">{cardType.icon}</div>
            <h3 className="font-semibold text-lg">{cardType.label}</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Create a personalized {cardType.label.toLowerCase()} card
            </p>
          </button>
        ))}
      </div>

      <div className="text-center pt-8">
        <Link href="/dashboard">
          <Button variant="outline" className="h-12 px-8 rounded-full border-border/50 hover:bg-secondary/50">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
