'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CardTypeSelector } from '@/components/card-type-selector'
import { CardDetailsForm } from '@/components/card-details-form'
import { CardPreview } from '@/components/card-preview'
import { AuthGateModal } from '@/components/auth-gate-modal'

interface CardData {
  cardType: string
  headline: string
  message: string
  imageUrl: string
  imagePrompt: string
}

interface PendingCard {
  cardType: string
  recipientName: string
  senderName: string
  copyHeadline: string
  copyMessage: string
  imageUrl: string
  imagePrompt: string
  extraPages: number
}

type Step = 'select-type' | 'details' | 'preview'

export default function CreateCardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('select-type')
  const [selectedType, setSelectedType] = useState('')
  const [senderName, setSenderName] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegeneratingHeadline, setIsRegeneratingHeadline] = useState(false)
  const [isRegeneratingMessage, setIsRegeneratingMessage] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [isGuest, setIsGuest] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [extraPages, setExtraPages] = useState(0)

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsGuest(!user)
    }
    checkAuth()
  }, [supabase])

  const handleCardTypeSelect = (type: string) => {
    setSelectedType(type)
    setStep('details')
  }

  const handleDetailsSubmit = async (details: {
    cardType: string
    senderName: string
    recipientName: string
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
      // Combine message and signoff into a single field
      const fullMessage = `${cardCopy.message}\n\n${cardCopy.signoff}`
      setCardData({
        cardType: details.cardType,
        headline: cardCopy.headline,
        message: fullMessage,
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

  const handleRegenerateHeadline = async () => {
    if (!cardData) return

    setIsRegeneratingHeadline(true)
    try {
      const response = await fetch('/api/regenerate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'headline',
          cardType: cardData.cardType,
          recipientName,
          senderName,
          currentValue: cardData.headline,
        }),
      })

      if (!response.ok) throw new Error('Failed to regenerate headline')

      const { text } = await response.json()
      setCardData({
        ...cardData,
        headline: text,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate headline')
    } finally {
      setIsRegeneratingHeadline(false)
    }
  }

  const handleRegenerateMessage = async () => {
    if (!cardData) return

    setIsRegeneratingMessage(true)
    try {
      const response = await fetch('/api/regenerate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'message',
          cardType: cardData.cardType,
          recipientName,
          senderName,
          currentValue: cardData.message,
        }),
      })

      if (!response.ok) throw new Error('Failed to regenerate message')

      const { text } = await response.json()
      setCardData({
        ...cardData,
        message: text,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate message')
    } finally {
      setIsRegeneratingMessage(false)
    }
  }

  const handleRegenerateImage = async () => {
    if (!cardData) return

    setIsRegeneratingImage(true)
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
      setIsRegeneratingImage(false)
    }
  }

  const storePendingCard = () => {
    if (!cardData) return

    const pendingCard: PendingCard = {
      cardType: cardData.cardType,
      recipientName,
      senderName,
      copyHeadline: cardData.headline,
      copyMessage: cardData.message,
      imageUrl: cardData.imageUrl,
      imagePrompt: cardData.imagePrompt,
      extraPages,
    }

    localStorage.setItem('pendingCard', JSON.stringify(pendingCard))
  }

  const handleSaveCard = async () => {
    if (!cardData) return

    // If user is a guest, show the auth modal
    if (isGuest) {
      storePendingCard()
      setShowAuthModal(true)
      return
    }

    // User is logged in, proceed with save
    setIsLoading(true)
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: cardData.cardType,
          recipientName,
          senderName,
          copyHeadline: cardData.headline,
          copyMessage: cardData.message,
          imageUrl: cardData.imageUrl,
          imagePrompt: cardData.imagePrompt,
          extraPages,
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

  const handleAuthRedirect = (type: 'login' | 'signup') => {
    storePendingCard()
    router.push(`/auth/${type === 'login' ? 'login' : 'sign-up'}?redirect=/create&action=save`)
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
            senderName={senderName}
            recipientName={recipientName}
            editMode={editMode}
            isGeneratingImage={isLoading}
            isGuest={isGuest}
            onHeadlineChange={(value) =>
              setCardData({ ...cardData, headline: value })
            }
            onMessageChange={(value) =>
              setCardData({ ...cardData, message: value })
            }
            onRegenerateHeadline={handleRegenerateHeadline}
            onRegenerateMessage={handleRegenerateMessage}
            onRegenerateImage={handleRegenerateImage}
            isRegeneratingHeadline={isRegeneratingHeadline}
            isRegeneratingMessage={isRegeneratingMessage}
            isRegeneratingImage={isRegeneratingImage}
            onSave={handleSaveCard}
            isSaving={isLoading}
            extraPages={extraPages}
            onAddPage={() => setExtraPages((prev) => prev + 1)}
          />
        )}

        {error && (
          <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/20 rounded p-4 max-w-sm text-destructive text-sm">
            {error}
          </div>
        )}

        <AuthGateModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => handleAuthRedirect('login')}
          onSignUp={() => handleAuthRedirect('signup')}
        />
      </div>
    </div>
  )
}
