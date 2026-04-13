'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

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
    <Card className="w-full max-w-lg p-8 border-border/40 shadow-sm rounded-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2 tracking-tight">Card Details</h2>
        <p className="text-muted-foreground">
          Tell us who this card is for and from
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="sender" className="block text-sm font-medium mb-2">
            From (Your Name) *
          </label>
          <Input
            id="sender"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name"
            disabled={isLoading}
            required
            className="h-12 border-border/50 bg-background/50 focus-visible:ring-1"
          />
        </div>

        <div>
          <label htmlFor="recipient" className="block text-sm font-medium mb-2">
            To (Recipient Name) *
          </label>
          <Input
            id="recipient"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient&apos;s name"
            disabled={isLoading}
            required
            className="h-12 border-border/50 bg-background/50 focus-visible:ring-1"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Any special details to personalize the card? (e.g., promotion, new job)"
            disabled={isLoading}
            className="w-full px-4 py-3 border border-border/50 rounded-lg bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px] resize-y"
          />
        </div>

        <div className="flex gap-3 pt-6">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="h-12 px-6 rounded-full border-border/50 hover:bg-secondary/50"
            >
              Back
            </Button>
          )}
          <Button type="submit" className="flex-1 h-12 rounded-full shadow-sm" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Generating Card...
              </>
            ) : (
              'Generate Card'
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
