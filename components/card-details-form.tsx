'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

interface CardDetailsFormProps {
  cardType: string
  onSubmit: (details: {
    cardType: string
    senderName: string
    recipientName: string
    customMessage?: string
  }) => Promise<void>
  isLoading?: boolean
  onBack?: () => void
}

export function CardDetailsForm({
  cardType,
  onSubmit,
  isLoading,
  onBack,
}: CardDetailsFormProps) {
  const [senderName, setSenderName] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!senderName || !recipientName) {
      setError('Please fill in all required fields')
      return
    }

    try {
      await onSubmit({
        cardType,
        senderName,
        recipientName,
        customMessage: customMessage || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg border-border/40 p-8">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Card Details</h2>
        <p className="text-muted-foreground">
          Tell us who this card is for and from
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="sender" className="mb-2 block text-sm font-medium">
            From (Your Name) *
          </label>
          <Input
            id="sender"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name"
            disabled={isLoading}
            required
            variant="soft"
          />
        </div>

        <div>
          <label htmlFor="recipient" className="mb-2 block text-sm font-medium">
            To (Recipient Name) *
          </label>
          <Input
            id="recipient"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient's name"
            disabled={isLoading}
            required
            variant="soft"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium">
            Additional Context (Optional)
          </label>
          <Textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Any special details to personalize the card? (e.g., promotion, new job)"
            disabled={isLoading}
            variant="card"
          />
        </div>

        <div className="flex gap-3 pt-6">
          <Button
            type="submit"
            size="lg"
            className="order-2 flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Generating Card...
              </>
            ) : (
              'Generate Card'
            )}
          </Button>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onBack}
              disabled={isLoading}
              className="order-1 border-border/50 hover:bg-secondary/50"
            >
              Back
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
