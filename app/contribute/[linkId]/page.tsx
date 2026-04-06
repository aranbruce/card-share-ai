'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Card3D } from '@/components/card-3d'

interface Contribution {
  id: string
  contributor_name: string
  message: string
  created_at: string
}

interface CardData {
  id: string
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  copy_signoff: string
  image_url: string
  status: string
}

export default function ContributeCardPage() {
  const params = useParams()
  const linkId = params.linkId as string

  const [card, setCard] = useState<CardData | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [contributorName, setContributorName] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (!contributorName || !message) {
      setError('Please enter your name and message')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/contribute/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorName,
          message,
        }),
      })

      if (!response.ok) throw new Error('Failed to add contribution')

      const { contribution } = await response.json()
      setContributions([...contributions, contribution])
      setContributorName('')
      setMessage('')
      setSubmitted(true)

      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add message'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
          <p className="text-muted-foreground">
            The card you&apos;re looking for doesn&apos;t exist or has been sent.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">You&apos;re Invited!</h1>
          <p className="text-muted-foreground">
            Add your message to this special card before it&apos;s sent
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* 3D Card Preview */}
          <div className="flex justify-center">
            <Card3D
              imageUrl={card.image_url}
              headline={card.copy_headline}
              message={card.copy_message}
              signoff={card.copy_signoff}
              senderName={card.sender_name || 'Someone special'}
              recipientName={card.recipient_name || 'You'}
              contributions={contributions}
            />
          </div>

          {/* Contribution Section */}
          <div className="space-y-6">
            {/* Add Message Form */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Add Your Message</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    {error}
                  </div>
                )}

                {submitted && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-green-600 text-sm">
                    Message added! Open the card to see it inside.
                  </div>
                )}

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-2"
                  >
                    Your Name *
                  </label>
                  <Input
                    id="name"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                    placeholder="Your name"
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium mb-2"
                  >
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your heartfelt message..."
                    disabled={submitting}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Adding Message...
                    </>
                  ) : (
                    'Add Message to Card'
                  )}
                </Button>
              </form>
            </Card>

            {/* Contributions Count */}
            {contributions.length > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <p className="text-sm text-center">
                  <span className="font-semibold">{contributions.length}</span>{' '}
                  {contributions.length === 1 ? 'message has' : 'messages have'} been added.
                  <span className="text-muted-foreground"> Open the card to see them!</span>
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
