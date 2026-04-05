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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create a Card</h2>
        <p className="text-muted-foreground">
          Choose what kind of card you&apos;d like to create
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARD_TYPES.map((cardType) => (
          <button
            key={cardType.id}
            onClick={() => onSelect(cardType.id)}
            className="group relative overflow-hidden rounded-lg border-2 border-transparent bg-secondary/50 p-6 transition-all hover:border-primary hover:bg-secondary"
          >
            <div className="text-4xl mb-3">{cardType.icon}</div>
            <h3 className="font-semibold">{cardType.label}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create a personalized {cardType.label.toLowerCase()} card
            </p>
          </button>
        ))}
      </div>

      <Link href="/dashboard">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  )
}
