'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

interface CardData {
  copy_headline: string
  copy_message: string
  copy_signoff: string
  image_url: string
}

interface Contribution {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Special Greeting Card</h1>
          <p className="text-muted-foreground">
            A personalized card created with care and messages from loved ones
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Card */}
          <div className="md:col-span-2">
            <Card className="overflow-hidden">
              {card.image_url && (
                <div className="aspect-square relative w-full overflow-hidden bg-secondary">
                  <Image
                    src={card.image_url}
                    alt="Card"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
              <div className="p-8 bg-background space-y-6">
                <h2 className="text-3xl font-bold text-balance">
                  {card.copy_headline}
                </h2>
                <p className="text-lg leading-relaxed text-balance whitespace-pre-wrap">
                  {card.copy_message}
                </p>
                <p className="text-lg font-semibold">{card.copy_signoff}</p>
              </div>
            </Card>
          </div>

          {/* Contributions */}
          <div>
            {contributions.length > 0 && (
              <Card className="p-6 sticky top-4">
                <h3 className="font-bold mb-4">
                  Messages ({contributions.length})
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {contributions.map((contrib, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-secondary/50 rounded border-l-4 border-primary"
                    >
                      <p className="font-semibold text-sm mb-2">
                        {contrib.contributor_name}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {contrib.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
