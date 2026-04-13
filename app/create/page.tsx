'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CardTypeSelector } from '@/components/card-type-selector'
import { CardDetailsForm } from '@/components/card-details-form'
import { CardPreview } from '@/components/card-preview'
import { AuthGateModal } from '@/components/auth-gate-modal'
import { Logo } from '@/components/logo'

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

function formatInnerCardCopy(message: string, signoff: string) {
  const m = message.trim()
  const s = signoff.trim()
  if (m && s) return `${m}\n\n${s}`
  return m || s
}

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
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [isGuest, setIsGuest] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

      const innerMessage = formatInnerCardCopy(
        cardCopy.message,
        cardCopy.signoff,
      )

      setSenderName(details.senderName)
      setRecipientName(details.recipientName)
      setCardData({
        cardType: details.cardType,
        headline: cardCopy.headline,
        message: innerMessage,
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

  const handleRegenerateHeadline = async (prompt: string) => {
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
          userPrompt: prompt,
        }),
      })

      if (!response.ok) throw new Error('Failed to regenerate headline')

      const { text } = await response.json()
      setCardData({
        ...cardData,
        headline: text,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to regenerate headline',
      )
    } finally {
      setIsRegeneratingHeadline(false)
    }
  }

  const handleRegenerateImage = async (prompt: string) => {
    if (!cardData) return

    setIsRegeneratingImage(true)
    try {
      // Use the user's prompt as the new image prompt
      const newPrompt = prompt || cardData.imagePrompt
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: newPrompt,
        }),
      })

      if (!response.ok) throw new Error('Failed to regenerate image')

      const { imageUrl } = await response.json()
      setCardData({
        ...cardData,
        imageUrl,
        imagePrompt: newPrompt,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to regenerate image',
      )
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
      extraPages: 0,
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
          recipientEmail: '', // Optional field
          senderName,
          copyHeadline: cardData.headline,
          copyMessage: cardData.message,
          imageUrl: cardData.imageUrl,
          imagePrompt: cardData.imagePrompt,
          extraPages: 0,
        }),
      })

      if (!response.ok) throw new Error('Failed to save card')

      const body = (await response.json()) as {
        card?: { id?: string }
        error?: string
      }
      const id =
        body.card &&
        typeof body.card === 'object' &&
        typeof body.card.id === 'string'
          ? body.card.id
          : undefined
      if (!id) {
        throw new Error(
          body.error ?? 'Save succeeded but no card id was returned',
        )
      }
      router.push(`/dashboard/cards/${id}?welcome=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthRedirect = (type: 'login' | 'signup') => {
    storePendingCard()
    router.push(
      `/auth/${type === 'login' ? 'login' : 'sign-up'}?redirect=/create&action=save`,
    )
  }

  const handleBackTotype = () => {
    setStep('select-type')
    setSelectedType('')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <header className="mb-8 flex items-center justify-center py-6">
        <Logo />
      </header>
      <div className="mx-auto max-w-4xl">
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
            message=""
            senderName={senderName}
            recipientName={recipientName}
            editMode={editMode}
            isGeneratingImage={isLoading}
            isGuest={isGuest}
            coverOnly
            onHeadlineChange={(value) =>
              setCardData({ ...cardData, headline: value })
            }
            onRegenerateHeadline={handleRegenerateHeadline}
            onRegenerateImage={handleRegenerateImage}
            isRegeneratingHeadline={isRegeneratingHeadline}
            isRegeneratingImage={isRegeneratingImage}
            onSave={handleSaveCard}
            isSaving={isLoading}
          />
        )}

        {error && (
          <div className="fixed right-4 bottom-4 max-w-sm rounded border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
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
