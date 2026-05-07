"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CardTypeSelector } from "@/components/card-type-selector"
import { CardDetailsForm } from "@/components/card-details-form"
import { AuthGateModal } from "@/components/auth-gate-modal"
import { Card3D } from "@/components/card-3d"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppHeader } from "@/components/app-header"
import { savePendingCard, type PendingCard } from "@/lib/pending-card-storage"
import { Paperclip, Sparkles, X } from "lucide-react"
import { handleImageFileChange } from "@/lib/handle-image-file-change"

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
  imageUrl: string
}

type Step = "select-type" | "details"

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
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<
    string | null
  >(null)
  const editImageFileRef = useRef<HTMLInputElement>(null)
  const [isReadingImageFile, setIsReadingImageFile] = useState(false)
  const [error, setError] = useState("")
  const [editImageError, setEditImageError] = useState("")
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
    attachedImageUrl?: string
  }) => {
    setError("")
    setSenderName(details.senderName)
    setRecipientName(details.recipientName)
    setCardData({
      cardType: details.cardType,
      headline: "",
      imageUrl: "",
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
          ...(details.attachedImageUrl
            ? { attachedImageUrl: details.attachedImageUrl }
            : {}),
        }),
      })

      if (!copyResponse.ok) {
        throw new Error("Failed to generate card copy")
      }

      const { cardCopy } = await copyResponse.json()

      setIsGeneratingCopy(false)
      setCardData((prev) =>
        prev ? { ...prev, headline: cardCopy.headline } : null,
      )

      const imageResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: details.cardType,
          coverHeadline: cardCopy.headline,
          ...(details.customMessage
            ? { customMessage: details.customMessage }
            : {}),
          ...(details.attachedImageUrl
            ? { attachedImageUrl: details.attachedImageUrl }
            : {}),
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
          existingCardCoverImageUrl: cardData.imageUrl,
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
    attachedImageUrl?: string,
  ) => {
    if (!cardData) return

    setIsRegeneratingImage(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: cardData.cardType,
          coverHeadline: cardData.headline,
          ...(prompt ? { imagePrompt: prompt } : {}),
          ...(cardData.imageUrl
            ? { existingCardCoverImageUrl: cardData.imageUrl }
            : {}),
          ...(attachedImageUrl ? { attachedImageUrl } : {}),
        }),
      })

      if (!response.ok) throw new Error("Failed to regenerate image")

      const { imageUrl } = (await response.json()) as { imageUrl?: string }
      setCardData((prev) =>
        prev ? { ...prev, imageUrl: imageUrl ?? prev.imageUrl } : null,
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
      copyMessage: "",
      imageUrl: cardData.imageUrl,
      extraPages: 0,
    }

    savePendingCard(pendingCard)
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
          imageUrl: cardData.imageUrl,
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
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push("/")
                }}
              >
                Sign out
              </Button>
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
        <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[420px_1fr]">
          <CardDetailsForm
            cardType={selectedType}
            onSubmit={handleDetailsSubmit}
            isLoading={isGeneratingCopy || isGeneratingImage}
            onBack={handleBackToType}
            hasGenerated={!!cardData}
            onContinue={handleSaveCard}
            isContinuing={isSaving}
          />

          {/* Right panel — live preview */}
          <main className="flex items-center justify-center bg-background px-10 py-12">
            <div className="w-full max-w-xl text-center">
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                Live preview
              </p>

              <div className="mx-auto mt-5 flex justify-center">
                {cardData && isGeneratingCopy ? (
                  <div className="w-full max-w-md">
                    <div className="mb-12 flex justify-center gap-2">
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <Skeleton
                      className="w-full rounded-2xl shadow-xl"
                      style={{ minHeight: 500 }}
                    />
                  </div>
                ) : cardData ? (
                  <div className="flex w-full max-w-md flex-col gap-12">
                    {openAiPanel === null ? (
                      <div className="flex h-9 items-center justify-center gap-2">
                        <ChipButton
                          onClick={() => setOpenAiPanel("image")}
                          disabled={isRegeneratingImage || isGeneratingImage}
                          className="text-xs"
                        >
                          {isRegeneratingImage ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Edit image
                        </ChipButton>
                        <ChipButton
                          onClick={() => setOpenAiPanel("title")}
                          disabled={isRegeneratingHeadline || isGeneratingCopy}
                          className="text-xs"
                        >
                          {isRegeneratingHeadline ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Edit title
                        </ChipButton>
                      </div>
                    ) : openAiPanel === "image" ? (
                      <div className="flex flex-col gap-2">
                        <input
                          ref={editImageFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (!e.target.files?.[0]) return
                            setIsReadingImageFile(true)
                            requestAnimationFrame(() => {
                              handleImageFileChange(
                                e,
                                (url) => {
                                  setAttachedImageDataUrl(url)
                                  setIsReadingImageFile(false)
                                },
                                setEditImageError,
                                editImageError,
                              )
                            })
                          }}
                        />
                        {attachedImageDataUrl && (
                          <div className="relative w-fit">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={attachedImageDataUrl}
                              alt="Reference"
                              className="max-h-48 max-w-full cursor-pointer rounded-xl"
                              onClick={() => editImageFileRef.current?.click()}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remove attached photo"
                              onClick={() => {
                                setAttachedImageDataUrl(null)
                                if (editImageFileRef.current)
                                  editImageFileRef.current.value = ""
                              }}
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="relative w-full">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              !isReadingImageFile &&
                              editImageFileRef.current?.click()
                            }
                            disabled={isRegeneratingImage}
                            className="absolute top-1/2 left-1 h-7 w-7 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
                            aria-label="Attach a photo"
                            title="Attach a photo"
                          >
                            {isReadingImageFile ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                          </Button>
                          <Input
                            autoFocus
                            className="rounded-full px-9 focus-visible:ring-1"
                            placeholder="Describe the image change…"
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (imagePrompt.trim() || attachedImageDataUrl)) {
                                void handleRegenerateImage(
                                  imagePrompt,
                                  attachedImageDataUrl ?? undefined,
                                )
                                setOpenAiPanel(null)
                                setImagePrompt("")
                                setAttachedImageDataUrl(null)
                                if (editImageFileRef.current)
                                  editImageFileRef.current.value = ""
                              }
                              if (e.key === "Escape") {
                                setOpenAiPanel(null)
                                setAttachedImageDataUrl(null)
                                setEditImageError("")
                                if (editImageFileRef.current)
                                  editImageFileRef.current.value = ""
                              }
                            }}
                            disabled={isRegeneratingImage}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Close image edit panel"
                            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
                            onClick={() => {
                              setOpenAiPanel(null)
                              setAttachedImageDataUrl(null)
                              setEditImageError("")
                              if (editImageFileRef.current)
                                editImageFileRef.current.value = ""
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {editImageError && (
                          <Alert variant="destructive">
                            <AlertDescription>
                              {editImageError}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          autoFocus
                          className="rounded-full pr-9 focus-visible:ring-1"
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
                          aria-label="Close title edit panel"
                          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
                          onClick={() => setOpenAiPanel(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <Card3D
                      imageUrl={cardData.imageUrl}
                      headline={cardData.headline}
                      message=""
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
        <div className="fixed right-4 bottom-4 max-w-md rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
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
