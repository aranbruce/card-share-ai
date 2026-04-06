'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Card3D } from '@/components/card-3d'

interface CardData {
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  copy_signoff: string
  image_url: string
}

interface Contribution {
  id: string
  contributor_name: string
  message: string
}

export default function PublicCardPage() {
  const params = useParams()
  const linkId = params.linkId as string

  const [card, setCard] = useState<CardData | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCard = async () => {
      try {
        const response = await fetch(`/api/contribute/${linkId}`)
        if (!response.ok) throw new Error('Card not found')

        const { card: cardData, contributions: contribs } =
          await response.json()
        setCard(cardData)
        setContributions(contribs)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load card'
        )
      } finally {
        setLoading(false)
      }
    }

    loadCard()
  }, [linkId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
          <p className="text-muted-foreground">{error || 'The card could not be loaded'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">A special card for</p>
          <h1 className="text-3xl font-bold mb-2">{card.recipient_name}</h1>
          <p className="text-muted-foreground">
            Click the card to open it and read your messages
          </p>
        </div>

        <Card3D
          imageUrl={card.image_url}
          headline={card.copy_headline}
          message={card.copy_message}
          signoff={card.copy_signoff}
          senderName={card.sender_name || 'Someone special'}
          recipientName={card.recipient_name || 'You'}
          contributions={contributions}
        />

        {contributions.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              This card contains {contributions.length} special {contributions.length === 1 ? 'message' : 'messages'} from loved ones
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Created with CardAI
          </p>
        </div>
      </div>
    </div>
  )
}
