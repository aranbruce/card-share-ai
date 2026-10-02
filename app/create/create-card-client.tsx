"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OccasionStep } from "@/components/occasion-step"
import { CardDetailsForm } from "@/components/card-details-form"
import { AuthGateModal } from "@/components/auth-gate-modal"
import { Card3D } from "@/components/card-3d"
import { CardBook3D } from "@/components/card-book-3d"
import { CardLoading3D } from "@/components/card-loading-3d"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  hasPendingCard,
  savePendingCard,
  type PendingCard,
} from "@/lib/pending-card-storage"
import {
  persistPendingCardAfterAuth,
  persistPendingCardErrorMessage,
} from "@/lib/persist-pending-card-after-auth"
import { Paperclip, Sparkles, X } from "lucide-react"
import { handleImageFileChange } from "@/lib/handle-image-file-change"
import { apiPost } from "@/lib/api-client"
import {
  regenerateCardHeadline,
  regenerateCardImage,
} from "@/lib/regenerate-card-client"
import posthog from "posthog-js"
import {
  CARD_TEMPLATES,
  defaultOccasionForTemplate,
} from "@/lib/card-templates"
import { cn } from "@/lib/utils"
import {
  CARD_OCCASIONS,
  DEFAULT_CARD_OCCASION,
  getCardOccasion,
} from "@/lib/card-occasions"

const TYPE_HUE: Record<string, number> = Object.fromEntries(
  CARD_OCCASIONS.map((o) => [o.id, o.hue]),
)

interface CardData {
  cardType: string
  headline: string
  imageUrl: string
}

type Step = "select-type" | "details"

export function CreateCardPageClient({
  initialTemplateId,
}: {
  /** A template linked from the gallery: start on the cover step with it picked. */
  initialTemplateId?: string
}) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const initialTemplate = CARD_TEMPLATES.find((t) => t.id === initialTemplateId)
  const [step, setStep] = useState<Step>(
    initialTemplate ? "details" : "select-type",
  )
  const [selectedType, setSelectedType] = useState(
    initialTemplate
      ? defaultOccasionForTemplate(initialTemplate)
      : DEFAULT_CARD_OCCASION,
  )
  const [senderName, setSenderName] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [isGeneratingHeadline, setIsGeneratingHeadline] = useState(false)
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
  const editImageRequestRef = useRef(0)
  const persistPendingAttemptedRef = useRef(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  // The template the current card was generated with, to spot when the picked one changes.
  const [generatedTemplateId, setGeneratedTemplateId] = useState<string | null>(
    null,
  )
  const [isReadingImageFile, setIsReadingImageFile] = useState(false)
  const [error, setError] = useState("")
  const [editImageError, setEditImageError] = useState("")
  const [isGuest, setIsGuest] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [cardTone, setCardTone] = useState<string | undefined>()
  const [cardUserContext, setCardUserContext] = useState<string | undefined>()
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    initialTemplate?.id ?? null,
  )

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

  // OAuth safety net: persist guest draft after callback lands here with a session
  useEffect(() => {
    if (isGuest || persistPendingAttemptedRef.current || !hasPendingCard()) {
      return
    }

    let cancelled = false
    persistPendingAttemptedRef.current = true
    setIsSaving(true)
    setError("")

    const persistDraft = async () => {
      const result = await persistPendingCardAfterAuth(supabase)
      if (cancelled) return

      if (result.ok) {
        router.replace(`/dashboard/cards/${result.cardId}`)
        return
      }

      setIsSaving(false)
      if (result.reason !== "none") {
        setError(persistPendingCardErrorMessage(result))
      }
      // Ref stays true — effect deps won't change; refresh to retry persist.
    }

    void persistDraft()

    return () => {
      cancelled = true
    }
  }, [isGuest, router, supabase])

  const handleCardTypeContinue = () => {
    setStep("details")
    posthog.capture("card_type_selected", { card_type: selectedType })
  }

  const handleDetailsSubmit = async (details: {
    cardType: string
    senderName: string
    recipientName: string
    tone?: string
    userContext?: string
    attachedImageUrl?: string
    templateId?: string
  }) => {
    setError("")
    setSenderName(details.senderName)
    setRecipientName(details.recipientName)
    setCardTone(details.tone)
    setGeneratedTemplateId(details.templateId ?? null)
    setCardUserContext(details.userContext)
    setCardData({
      cardType: details.cardType,
      headline: "",
      imageUrl: "",
    })
    setIsGeneratingHeadline(true)
    setIsGeneratingImage(true)
    // On phones the card replaces the form until they choose to edit the details.
    setShowMobilePreview(true)
    window.scrollTo({ top: 0 })

    try {
      const { text: headline } = await apiPost<{ text?: string }>(
        "/api/generate-headline",
        {
          cardType: details.cardType,
          recipientName: details.recipientName,
          ...(details.tone ? { tone: details.tone } : {}),
          ...(details.userContext ? { userContext: details.userContext } : {}),
          ...(details.attachedImageUrl
            ? { attachedImageUrl: details.attachedImageUrl }
            : {}),
        },
      )

      setIsGeneratingHeadline(false)
      setCardData((prev) =>
        prev ? { ...prev, headline: headline ?? "" } : null,
      )

      const { imageUrl } = await apiPost<{ imageUrl?: string }>(
        "/api/generate-image",
        {
          cardType: details.cardType,
          recipientName: details.recipientName,
          coverHeadline: headline ?? "",
          ...(details.tone ? { tone: details.tone } : {}),
          ...(details.userContext ? { userContext: details.userContext } : {}),
          ...(details.attachedImageUrl
            ? { attachedImageUrl: details.attachedImageUrl }
            : {}),
          ...(details.templateId ? { templateId: details.templateId } : {}),
        },
      )

      setCardData((prev) =>
        prev ? { ...prev, imageUrl: imageUrl ?? "" } : null,
      )
      posthog.capture("card_generated", {
        card_type: details.cardType,
        has_custom_message: Boolean(details.userContext),
        has_attached_image: Boolean(details.attachedImageUrl),
        template_id: details.templateId ?? null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      setCardData(null)
      posthog.captureException(err instanceof Error ? err : new Error(message))
    } finally {
      setIsGeneratingHeadline(false)
      setIsGeneratingImage(false)
    }
  }

  const handleRegenerateHeadline = async (prompt: string) => {
    if (!cardData) return

    setIsRegeneratingHeadline(true)
    try {
      const headline = await regenerateCardHeadline({
        page: "create",
        cardType: cardData.cardType,
        recipientName,
        cardTitle: cardData.headline,
        coverImageUrl: cardData.imageUrl,
        userPrompt: prompt,
        tone: cardTone,
        userContext: cardUserContext,
      })
      setCardData({ ...cardData, headline })
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
      const imageUrl = await regenerateCardImage({
        page: "create",
        cardType: cardData.cardType,
        recipientName,
        coverHeadline: cardData.headline,
        coverImageUrl: cardData.imageUrl,
        userPrompt: prompt,
        attachedImageUrl,
        tone: cardTone,
        userContext: cardUserContext,
      })
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
      `/${type === "login" ? "login" : "sign-up"}?redirect=/create&action=save`,
    )
  }

  const handleBackToType = () => {
    setStep("select-type")
    setShowMobilePreview(false)
  }

  const selectedOccasion = getCardOccasion(selectedType)
  // Picking a different template after generating makes the card out of date: the preview
  // goes back to the example cover and the form offers only Regenerate.
  const isStale = !!cardData && previewTemplateId !== generatedTemplateId
  const mobilePreview =
    step === "details" && !!cardData && !isStale && showMobilePreview
  const previewTemplate = CARD_TEMPLATES.find((t) => t.id === previewTemplateId)
  // The preview card follows the steps: the occasion's cover, then the chosen template.
  const showTemplate = step === "details" && previewTemplate
  const exampleCover = showTemplate
    ? previewTemplate.thumbnail
    : (selectedOccasion?.cover ?? null)
  const exampleCaption = showTemplate
    ? `${previewTemplate.name}. Your photo goes where the oval is, and the whole scene is redrawn around them.`
    : selectedOccasion?.cover
      ? `Example ${selectedOccasion.label} cover. Yours is generated from your details.`
      : "We\u2019ll design a cover from the details you add."

  // The flat cover editor: shown while generating (for the shimmer), without WebGL, and
  // embedded over the 3D cover when it is clicked for editing.
  const renderCover = (embedded: boolean) =>
    cardData ? (
      <Card3D
        embedded={embedded}
        imageUrl={cardData.imageUrl}
        headline={cardData.headline}
        message=""
        recipientName={recipientName}
        isGeneratingImage={isGeneratingImage}
        isGeneratingHeadline={isGeneratingHeadline}
        editable
        coverOnly
        onHeadlineChange={(value) =>
          setCardData({ ...cardData, headline: value })
        }
        isRegeneratingHeadline={isRegeneratingHeadline}
        isRegeneratingImage={isRegeneratingImage}
      />
    ) : null

  return (
    <div className="min-h-svh bg-background">
      {/* Studio: the left panel steps from occasion to details; the preview stays put */}
      <div className="grid min-h-svh grid-cols-1 md:grid-cols-[360px_1fr] lg:grid-cols-[480px_1fr]">
        {step === "select-type" && (
          <OccasionStep
            selected={selectedType}
            onSelect={setSelectedType}
            onContinue={handleCardTypeContinue}
            backHref={isGuest ? "/" : "/dashboard"}
            backLabel={isGuest ? "Back" : "Back to dashboard"}
            error={error}
          />
        )}
        <CardDetailsForm
          hidden={step === "select-type"}
          cardType={selectedType}
          initialTemplateId={initialTemplate?.id}
          onSubmit={handleDetailsSubmit}
          isLoading={isGeneratingHeadline || isGeneratingImage}
          onBack={handleBackToType}
          hasGenerated={!!cardData && !isStale}
          isStale={isStale}
          onContinue={handleSaveCard}
          isContinuing={isSaving}
          onTemplateChange={setPreviewTemplateId}
          actionError={error}
          hiddenOnMobile={mobilePreview}
          onShowCard={() => {
            setShowMobilePreview(true)
            window.scrollTo({ top: 0 })
          }}
        />

        {/* Right panel — live preview */}
        <main
          className={cn(
            "min-w-0 items-center justify-center bg-background px-6 pt-6 pb-4 md:px-10 md:py-12",
            // On phones the steps get the whole screen; the card takes over once generated.
            // There the card's width is capped from the visible height (svh) so the label,
            // edit chips, card and buttons fit on one screen (270px is roughly everything but the card),
            // but never below 16rem wide; shorter phones scroll instead. The buttons sit at the
            // bottom, level with the form's Continue.
            mobilePreview ? "flex" : "hidden md:flex",
          )}
        >
          {step === "select-type" || !cardData || isStale ? (
            // Before a card is generated: the occasion's example cover, or the chosen template.
            <div className="flex w-full max-w-xl flex-col items-center text-center">
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                Live preview
              </p>
              <CardLoading3D
                variant="preview"
                imageUrl={exampleCover}
                hue={TYPE_HUE[selectedType] ?? 40}
                className="mx-auto mt-5"
              />
              <p className="mt-4 max-w-[360px] text-sm leading-normal text-muted-foreground">
                {exampleCaption}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-xl text-center max-md:flex max-md:flex-col max-md:self-stretch">
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                Live preview
              </p>

              <div className="mx-auto mt-5 flex justify-center max-md:w-full max-md:flex-1 max-md:items-center">
                {cardData && isGeneratingHeadline ? (
                  <div className="w-full max-w-md max-md:max-w-[min(28rem,max(16rem,calc((100svh-270px)*0.8)))]">
                    <div className="mb-6 flex justify-center gap-2 md:mb-12">
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <CardLoading3D
                      hue={TYPE_HUE[selectedType] ?? 40}
                      label="Writing your headline…"
                      className="mx-auto"
                    />
                  </div>
                ) : cardData ? (
                  <div className="flex w-full max-w-md flex-col gap-6 max-md:max-w-[min(28rem,max(16rem,calc((100svh-270px)*0.8)))] md:gap-12">
                    {openAiPanel === null ? (
                      <div className="flex h-9 items-center justify-center gap-2">
                        <ChipButton
                          onClick={() => setOpenAiPanel("image")}
                          disabled={isRegeneratingImage || isGeneratingImage}
                          className="text-xs"
                        >
                          {isRegeneratingImage ? (
                            <Spinner className="size-3" />
                          ) : (
                            <Sparkles className="size-3" />
                          )}
                          Edit image
                        </ChipButton>
                        <ChipButton
                          onClick={() => setOpenAiPanel("title")}
                          disabled={
                            isRegeneratingHeadline || isGeneratingHeadline
                          }
                          className="text-xs"
                        >
                          {isRegeneratingHeadline ? (
                            <Spinner className="size-3" />
                          ) : (
                            <Sparkles className="size-3" />
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
                            const reqId = ++editImageRequestRef.current
                            requestAnimationFrame(() => {
                              handleImageFileChange(
                                e,
                                (url) => {
                                  if (reqId !== editImageRequestRef.current)
                                    return
                                  setAttachedImageDataUrl(url)
                                  setIsReadingImageFile(false)
                                },
                                (msg) => {
                                  if (reqId !== editImageRequestRef.current)
                                    return
                                  setEditImageError(msg)
                                  setIsReadingImageFile(false)
                                },
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
                              className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
                            >
                              <X className="size-3" />
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
                            className="absolute top-1/2 left-1 size-7 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
                            aria-label="Attach a photo"
                            title="Attach a photo"
                          >
                            {isReadingImageFile ? <Spinner /> : <Paperclip />}
                          </Button>
                          <Input
                            autoFocus
                            className="rounded-full px-9 focus-visible:ring-1"
                            placeholder="Describe the image change…"
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                (imagePrompt.trim() || attachedImageDataUrl)
                              ) {
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
                                editImageRequestRef.current++
                                setIsReadingImageFile(false)
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
                            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded-full"
                            onClick={() => {
                              editImageRequestRef.current++
                              setIsReadingImageFile(false)
                              setOpenAiPanel(null)
                              setAttachedImageDataUrl(null)
                              setEditImageError("")
                              if (editImageFileRef.current)
                                editImageFileRef.current.value = ""
                            }}
                          >
                            <X className="size-3.5" />
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
                          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded-full"
                          onClick={() => setOpenAiPanel(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    {cardData.imageUrl &&
                    !isGeneratingImage &&
                    !isRegeneratingImage &&
                    !isRegeneratingHeadline ? (
                      <CardBook3D
                        imageUrl={cardData.imageUrl}
                        headline={cardData.headline}
                        message=""
                        recipientName={recipientName}
                        coverOnly
                        renderPageEditor={() => renderCover(true)}
                        fallback={renderCover(false)}
                      />
                    ) : isGeneratingImage ||
                      isRegeneratingImage ||
                      isRegeneratingHeadline ? (
                      <CardLoading3D
                        hue={TYPE_HUE[selectedType] ?? 40}
                        imageUrl={
                          isGeneratingImage ? null : cardData.imageUrl || null
                        }
                        label={
                          isRegeneratingImage
                            ? "Painting a new cover…"
                            : isRegeneratingHeadline
                              ? "Writing a new title…"
                              : "Designing your cover…"
                        }
                      />
                    ) : (
                      renderCover(false)
                    )}
                  </div>
                ) : null}
              </div>

              {/* Phones: the form is hidden while the card shows */}
              <div className="mt-auto flex flex-col gap-4 pt-6 md:hidden">
                {error && (
                  <Alert variant="destructive" className="text-left">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowMobilePreview(false)
                      window.scrollTo({ top: 0 })
                    }}
                  >
                    Edit details
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveCard}
                    disabled={
                      isSaving ||
                      isGeneratingHeadline ||
                      isGeneratingImage ||
                      isRegeneratingHeadline ||
                      isRegeneratingImage
                    }
                  >
                    {isSaving ? (
                      <>
                        <Spinner />
                        Saving…
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <AuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => handleAuthRedirect("login")}
        onSignUp={() => handleAuthRedirect("signup")}
      />
    </div>
  )
}
