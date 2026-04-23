"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CardTypeSelector } from "@/components/card-type-selector"
import { CardDetailsForm } from "@/components/card-details-form"
import { AuthGateModal } from "@/components/auth-gate-modal"
import { Card3D } from "@/components/card-3d"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AppHeader } from "@/components/app-header"
import { Sparkles, X } from "lucide-react"

const TYPE_HUE: Record<string, number> = {
  birthday: 18,
  thank_you: 40,
  congratulations: 70,
  holiday: 150,
  sympathy: 310,
  custom: 230,
}

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

type Step = "select-type" | "details"

function formatInnerCardCopy(message: string, signoff: string) {
  const m = message.trim()
  const s = signoff.trim()
  if (m && s) return `${m}\n\n${s}`
  return m || s
}

export default function CreateCardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>("select-type")
  const [selectedType, setSelectedType] = useState("")
  const [senderName, setSenderName] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegeneratingHeadline, setIsRegeneratingHeadline] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [openAiPanel, setOpenAiPanel] = useState<"image" | "title" | null>(null)
  const [imagePrompt, setImagePrompt] = useState("")
  const [titlePrompt, setTitlePrompt] = useState("")
  const [error, setError] = useState("")
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
    setStep("details")
  }

  const handleDetailsSubmit = async (details: {
    cardType: string
    senderName: string
    recipientName: string
    customMessage?: string
  }) => {
    setError("")
    setSenderName(details.senderName)
    setRecipientName(details.recipientName)
    setCardData({
      cardType: details.cardType,
      headline: "",
      message: "",
      imageUrl: "",
      imagePrompt: "",
    })
    setIsGeneratingCopy(true)
    setIsGeneratingImage(true)

    try {
      const copyResponse = await fetch("/api/generate-card-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: details.cardType,
          recipientName: details.recipientName,
          senderName: details.senderName,
          customMessage: details.customMessage,
        }),
      })

      if (!copyResponse.ok) {
        throw new Error("Failed to generate card copy")
      }

      const { cardCopy } = await copyResponse.json()
      const innerMessage = formatInnerCardCopy(
        cardCopy.message,
        cardCopy.signoff,
      )

      setIsGeneratingCopy(false)
      setCardData((prev) =>
        prev
          ? {
              ...prev,
              headline: cardCopy.headline,
              message: innerMessage,
              imagePrompt: cardCopy.imagePrompt,
            }
          : null,
      )

      const imageResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: cardCopy.imagePrompt,
          coverHeadline: cardCopy.headline,
        }),
      })

      if (!imageResponse.ok) {
        throw new Error("Failed to generate image")
      }

      const { imageUrl } = await imageResponse.json()

      setCardData((prev) => (prev ? { ...prev, imageUrl } : null))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setCardData(null)
    } finally {
      setIsGeneratingCopy(false)
      setIsGeneratingImage(false)
    }
  }

  const handleRegenerateHeadline = async (prompt: string) => {
    if (!cardData) return

    setIsRegeneratingHeadline(true)
    try {
      const response = await fetch("/api/regenerate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "headline",
          cardType: cardData.cardType,
          recipientName,
          senderName,
          currentValue: cardData.headline,
          userPrompt: prompt,
          coverImagePrompt: cardData.imagePrompt,
        }),
      })

      if (!response.ok) throw new Error("Failed to regenerate headline")

      const { text } = await response.json()
      setCardData({
        ...cardData,
        headline: text,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate headline",
      )
    } finally {
      setIsRegeneratingHeadline(false)
    }
  }

  const handleRegenerateImage = async (
    prompt: string,
    sourceImageUrl?: string,
  ) => {
    if (!cardData) return

    setIsRegeneratingImage(true)
    try {
      // Use the user's prompt as the new image prompt
      const newPrompt = prompt || cardData.imagePrompt
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: newPrompt,
          coverHeadline: cardData.headline,
          ...(sourceImageUrl ? { sourceImageUrl } : {}),
        }),
      })

      if (!response.ok) throw new Error("Failed to regenerate image")

      const { imageUrl } = (await response.json()) as { imageUrl?: string }
      setCardData((prev) =>
        prev
          ? {
              ...prev,
              imageUrl: imageUrl ?? prev.imageUrl,
              imagePrompt: newPrompt,
            }
          : null,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate image",
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

    localStorage.setItem("pendingCard", JSON.stringify(pendingCard))
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
    setIsSaving(true)
    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: cardData.cardType,
          recipientName,
          recipientEmail: "", // Optional field
          senderName,
          copyHeadline: cardData.headline,
          copyMessage: cardData.message,
          imageUrl: cardData.imageUrl,
          imagePrompt: cardData.imagePrompt,
          extraPages: 0,
        }),
      })

      if (!response.ok) throw new Error("Failed to save card")

      const body = (await response.json()) as {
        card?: { id?: string }
        error?: string
      }
      const id =
        body.card &&
        typeof body.card === "object" &&
        typeof body.card.id === "string"
          ? body.card.id
          : undefined
      if (!id) {
        throw new Error(
          body.error ?? "Save succeeded but no card id was returned",
        )
      }
      router.push(`/dashboard/cards/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAuthRedirect = (type: "login" | "signup") => {
    storePendingCard()
    router.push(
      `/auth/${type === "login" ? "login" : "sign-up"}?redirect=/create&action=save`,
    )
  }

  const handleBackToType = () => {
    setStep("select-type")
    setSelectedType("")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header — shown for select-type and preview, hidden in studio (which has its own back link) */}
      {step !== "details" && (
        <AppHeader
          right={
            !isGuest ? (
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push("/")
                }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            ) : undefined
          }
        />
      )}

      {/* Select type — constrained width */}
      {step === "select-type" && (
        <div className="mx-auto max-w-4xl p-6 md:p-10">
          <CardTypeSelector onSelect={handleCardTypeSelect} isGuest={isGuest} />
        </div>
      )}

      {/* Studio — full-width two-column layout */}
      {step === "details" && (
        <div className="grid min-h-[calc(100vh-0px)] grid-cols-1 lg:grid-cols-[420px_1fr]">
          <CardDetailsForm
            cardType={selectedType}
            onSubmit={handleDetailsSubmit}
            isLoading={isGeneratingCopy || isGeneratingImage}
            onBack={handleBackToType}
          />

          {/* Right panel — live preview */}
          <main className="flex items-center justify-center bg-background px-10 py-12">
            <div className="w-full max-w-xl text-center">
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                Live preview
              </p>

              <div className="mx-auto mt-5 flex justify-center">
                {cardData ? (
                  <div className="flex w-full max-w-md flex-col gap-12">
                    {openAiPanel === null ? (
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenAiPanel("image")}
                          disabled={isRegeneratingImage || isGeneratingImage}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                        >
                          {isRegeneratingImage ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Edit image
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenAiPanel("title")}
                          disabled={isRegeneratingHeadline || isGeneratingCopy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                        >
                          {isRegeneratingHeadline ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Edit title
                        </button>
                      </div>
                    ) : openAiPanel === "image" ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                          placeholder="Describe the image change…"
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && imagePrompt.trim()) {
                              void handleRegenerateImage(imagePrompt)
                              setOpenAiPanel(null)
                              setImagePrompt("")
                            }
                            if (e.key === "Escape") setOpenAiPanel(null)
                          }}
                          disabled={isRegeneratingImage}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => setOpenAiPanel(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                          placeholder="Describe the title change…"
                          value={titlePrompt}
                          onChange={(e) => setTitlePrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && titlePrompt.trim()) {
                              void handleRegenerateHeadline(titlePrompt)
                              setOpenAiPanel(null)
                              setTitlePrompt("")
                            }
                            if (e.key === "Escape") setOpenAiPanel(null)
                          }}
                          disabled={isRegeneratingHeadline}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => setOpenAiPanel(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <Card3D
                      imageUrl={cardData.imageUrl}
                      headline={cardData.headline}
                      message={cardData.message}
                      senderName={senderName}
                      recipientName={recipientName}
                      isGeneratingImage={isGeneratingImage}
                      isGeneratingHeadline={isGeneratingCopy}
                      editable
                      coverOnly
                      onHeadlineChange={(value) =>
                        setCardData({ ...cardData, headline: value })
                      }
                      isRegeneratingHeadline={isRegeneratingHeadline}
                      isRegeneratingImage={isRegeneratingImage}
                    />
                    <Button
                      size="lg"
                      fullWidth
                      onClick={handleSaveCard}
                      disabled={
                        isSaving || isGeneratingImage || isGeneratingCopy
                      }
                    >
                      {isSaving ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Saving...
                        </>
                      ) : (
                        "Write message"
                      )}
                    </Button>
                  </div>
                ) : (
                  /* Placeholder card — matches Card3D dimensions */
                  <div
                    className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-xl"
                    style={{ minHeight: 500 }}
                  >
                    <div
                      className="flex h-full w-full flex-col items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.92 0.07 ${TYPE_HUE[selectedType] ?? 40}) 0%, oklch(0.82 0.12 ${(TYPE_HUE[selectedType] ?? 40) - 15}) 100%)`,
                      }}
                    >
                      <div className="flex flex-col items-center gap-3 px-6 text-center">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl opacity-60"
                          style={{
                            background: `oklch(0.7 0.14 ${TYPE_HUE[selectedType] ?? 40})`,
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                          </svg>
                        </div>
                        <p
                          className="text-xs leading-relaxed opacity-70"
                          style={{
                            color: `oklch(0.25 0.06 ${TYPE_HUE[selectedType] ?? 40})`,
                          }}
                        >
                          Fill in the details and hit Generate to see your card
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {error && (
        <div className="fixed right-4 bottom-4 max-w-sm rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <AuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => handleAuthRedirect("login")}
        onSignUp={() => handleAuthRedirect("signup")}
      />
    </div>
  )
}
