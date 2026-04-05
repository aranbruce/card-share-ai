'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CardTypeSelector } from '@/components/card-type-selector'
import { CardDetailsForm } from '@/components/card-details-form'
import { CardPreview } from '@/components/card-preview'

interface CardData {
  cardType: string
  headline: string
  message: string
  signoff: string
  imageUrl: string
  imagePrompt: string
}

type Step = 'select-type' | 'details' | 'preview'

export default function CreateCardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select-type')
  const [selectedType, setSelectedType] = useState('')
  const [senderName, setSenderName] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)

  const handleCardTypeSelect = (type: string) => {
    setSelectedType(type)
    setStep('details')
  }

  const handleDetailsSubmit = async (details: {
    cardType: string
    senderName: string
    recipientName: string
    recipientEmail: string
    customMessage?: string
  }) => {
    setIsLoading(true)
    setError('')

    try {
      // Generate card copy
      const copyResponse = await fetch('/api/generate-card-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: details.cardType,
          recipientName: details.recipientName,
          senderName: details.senderName,
          customMessage: details.customMessage,
        }),
      })

      if (!copyResponse.ok) {
        throw new Error('Failed to generate card copy')
      }

      const { cardCopy } = await copyResponse.json()

      // Generate image
      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: cardCopy.imagePrompt,
        }),
      })

      if (!imageResponse.ok) {
        throw new Error('Failed to generate image')
      }

      const { imageUrl } = await imageResponse.json()

      setSenderName(details.senderName)
      setRecipientName(details.recipientName)
      setRecipientEmail(details.recipientEmail)
      setCardData({
        cardType: details.cardType,
        headline: cardCopy.headline,
        message: cardCopy.message,
        signoff: cardCopy.signoff,
        imageUrl,
        imagePrompt: cardCopy.imagePrompt,
      })
      setStep('preview')
      setEditMode(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateCopy = async () => {
    if (!cardData) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-card-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: cardData.cardType,
          recipientName,
          senderName,
        }),
      })

      if (!response.ok) throw new Error('Failed to regenerate copy')

      const { cardCopy } = await response.json()
      setCardData({
        ...cardData,
        headline: cardCopy.headline,
        message: cardCopy.message,
        signoff: cardCopy.signoff,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate copy')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateImage = async () => {
    if (!cardData) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: cardData.imagePrompt,
        }),
      })

      if (!response.ok) throw new Error('Failed to regenerate image')

      const { imageUrl } = await response.json()
      setCardData({
        ...cardData,
        imageUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCard = async () => {
    if (!cardData) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: cardData.cardType,
          recipientName,
          recipientEmail,
          senderName,
          copyHeadline: cardData.headline,
          copyMessage: cardData.message,
          copySignoff: cardData.signoff,
          imageUrl: cardData.imageUrl,
          imagePrompt: cardData.imagePrompt,
        }),
      })

      if (!response.ok) throw new Error('Failed to save card')

      const { card } = await response.json()
      router.push(`/dashboard/cards/${card.id || card}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackTotype = () => {
    setStep('select-type')
    setSelectedType('')
  }

  const handleBackToDetails = () => {
    setStep('details')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {step === 'select-type' && (
          <CardTypeSelector onSelect={handleCardTypeSelect} />
        )}

        {step === 'details' && (
          <CardDetailsForm
            cardType={selectedType}
            onSubmit={handleDetailsSubmit}
            isLoading={isLoading}
            onBack={handleBackTotype}
          />
        )}

        {step === 'preview' && cardData && (
          <CardPreview
            imageUrl={cardData.imageUrl}
            headline={cardData.headline}
            message={cardData.message}
            signoff={cardData.signoff}
            senderName={senderName}
            recipientName={recipientName}
            editMode={editMode}
            isGeneratingImage={isLoading}
            onHeadlineChange={(value) =>
              setCardData({ ...cardData, headline: value })
            }
            onMessageChange={(value) =>
              setCardData({ ...cardData, message: value })
            }
            onSignoffChange={(value) =>
              setCardData({ ...cardData, signoff: value })
            }
            onRegenerateCopy={handleRegenerateCopy}
            onRegenerateImage={handleRegenerateImage}
            onSave={handleSaveCard}
            isSaving={isLoading}
          />
        )}

        {error && (
          <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/20 rounded p-4 max-w-sm text-destructive text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
