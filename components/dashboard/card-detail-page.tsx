"use client"

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import {
  ContributorShareModal,
  RecipientShareModal,
} from "@/components/share-modal"
import {
  CardOwnerStudio,
  type ActiveContributionFormattingState,
  type CardOwnerStudioHandle,
} from "@/components/card-owner-studio"
import { ArrowLeft, Paperclip, Send, Sparkles, UserPlus, X } from "lucide-react"
import { handleImageFileChange } from "@/lib/handle-image-file-change"
import { NotePanel } from "@/components/note-panel"
import { fullCardPageCount } from "@/components/card-3d/card-page-spread"
import { MessageFontVariables } from "@/components/message-font-variables"
import posthog from "posthog-js"
import type { OwnerCardDetail, OwnerCardDetailCard } from "@/lib/owner-cards"

/** Every card has at least two inside pages (the first spread), from creation. */
const MIN_INSIDE_PAGES = fullCardPageCount(0) - 1

function CardDetailLayout({
  children,
  panel,
}: {
  children: ReactNode
  panel: ReactNode
}) {
  return (
    <MessageFontVariables className="flex flex-1 flex-col md:grid md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_420px]">
      <main className="flex flex-col gap-7 p-10 md:h-[calc(100dvh-56px)] md:overflow-y-auto md:px-12">
        <Button
          asChild
          variant="outline"
          size="default"
          className="w-fit self-start"
        >
          <Link href="/dashboard">
            <ArrowLeft />
            Dashboard
          </Link>
        </Button>
        {children}
      </main>
      {panel}
    </MessageFontVariables>
  )
}

export type CardDetailPageClientProps = {
  cardId: string
  initialData: OwnerCardDetail
  initialDraftTextColor: string
}

export function CardDetailPageClient({
  cardId,
  initialData,
  initialDraftTextColor,
}: CardDetailPageClientProps) {
  const [card, setCard] = useState<OwnerCardDetailCard>(initialData.card)
  const [reloadNonce, setReloadNonce] = useState<number | undefined>(undefined)
  const [error, setError] = useState("")
  const [showContributorShareModal, setShowContributorShareModal] =
    useState(false)
  const [showRecipientShareModal, setShowRecipientShareModal] = useState(false)
  const [activeContribution, setActiveContribution] =
    useState<ActiveContributionFormattingState | null>(null)
  const [isRefining, setIsRefining] = useState(false)

  const studioRef = useRef<CardOwnerStudioHandle>(null)
  const [openAiPanel, setOpenAiPanel] = useState<"image" | "title" | null>(null)
  const [imagePrompt, setImagePrompt] = useState("")
  const [titlePrompt, setTitlePrompt] = useState("")
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<
    string | null
  >(null)
  const editImageFileRef = useRef<HTMLInputElement>(null)
  const editImageRequestRef = useRef(0)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [isRegeneratingHeadline, setIsRegeneratingHeadline] = useState(false)
  const [isReadingImageFile, setIsReadingImageFile] = useState(false)

  const handleCardDataChange = useCallback(
    (
      updates: Partial<{
        copy_headline: string
        image_url: string
      }>,
    ) => {
      setCard((prev) => ({ ...prev, ...updates }))
    },
    [],
  )

  const handleRegenerateImageFromSidebar = async (
    prompt: string,
    attachedImageUrl?: string,
  ) => {
    if (!prompt.trim() && !attachedImageUrl) return
    await studioRef.current?.regenerateImage(prompt, attachedImageUrl)
    setImagePrompt("")
    setAttachedImageDataUrl(null)
    if (editImageFileRef.current) editImageFileRef.current.value = ""
  }

  const handleEditImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setIsReadingImageFile(true)
    const reqId = ++editImageRequestRef.current
    requestAnimationFrame(() => {
      handleImageFileChange(
        e,
        (url) => {
          if (reqId !== editImageRequestRef.current) return
          setAttachedImageDataUrl(url)
          setIsReadingImageFile(false)
        },
        (msg) => {
          if (reqId !== editImageRequestRef.current) return
          setError(msg)
          setIsReadingImageFile(false)
        },
        error,
      )
    })
  }

  const handleRegenerateTitleFromSidebar = async (prompt: string) => {
    if (!prompt.trim()) return
    await studioRef.current?.regenerateHeadline(prompt)
    setTitlePrompt("")
  }

  const closeImagePanel = useCallback(() => {
    editImageRequestRef.current++
    setIsReadingImageFile(false)
    setOpenAiPanel(null)
    setAttachedImageDataUrl(null)
    if (editImageFileRef.current) editImageFileRef.current.value = ""
  }, [])

  const handleAiRefine = async (prompt: string) => {
    if (!activeContribution || !prompt.trim()) return
    setIsRefining(true)
    try {
      await activeContribution.onAiRefine(prompt)
    } finally {
      setIsRefining(false)
    }
  }

  return (
    <>
      <CardDetailLayout
        panel={
          <NotePanel
            title="Format your note"
            values={{
              textColor: activeContribution?.textColor,
              giphyUrl: activeContribution?.giphyUrl,
              fontSize: activeContribution?.fontSize,
              fontFamily: activeContribution?.fontFamily,
              rotationDegrees: activeContribution
                ? Math.round(activeContribution.rotationDegrees ?? 0)
                : 0,
              pageIndex: activeContribution?.pageIndex,
            }}
            isRegenerating={
              isRefining || Boolean(activeContribution?.isRegeneratingMessage)
            }
            onRegenerate={handleAiRefine}
            onTextColorChange={(color) =>
              activeContribution?.onTextColorChange(color)
            }
            onFontSizeChange={(px) => activeContribution?.onFontSizeChange(px)}
            onFontFamilyChange={(id) =>
              activeContribution?.onFontFamilyChange(id)
            }
            onRotationChange={(deg) =>
              activeContribution?.onRotationChange(deg)
            }
            onPageChange={(page) => activeContribution?.onPageChange(page)}
            onOpenGifPicker={() => activeContribution?.onGifOpen()}
            onGifChange={(url) => {
              if (url === null) activeContribution?.onGifClear?.()
            }}
            totalInnerPages={
              activeContribution?.totalInnerPages ?? MIN_INSIDE_PAGES
            }
            footer={
              <div className="mt-auto flex flex-col gap-6">
                <div className="h-px bg-border" />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Share
                  </p>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Invite contributors with a link, or send the finished card
                    directly to {card.recipient_name}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="default"
                      variant="outline"
                      onClick={() => {
                        setShowContributorShareModal(true)
                        posthog.capture("contributor_share_modal_opened", {
                          card_id: cardId,
                        })
                      }}
                      className="w-full"
                    >
                      <UserPlus />
                      Share with contributors
                    </Button>
                    <Button
                      size="default"
                      onClick={() => {
                        setShowRecipientShareModal(true)
                        posthog.capture("recipient_share_modal_opened", {
                          card_id: cardId,
                        })
                      }}
                      className="w-full"
                    >
                      <Send />
                      Send to recipient
                    </Button>
                  </div>
                </div>
              </div>
            }
          />
        }
      >
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
            The card
          </p>
          <h1 className="mt-1.5 text-[34px] leading-none font-semibold tracking-[-0.03em]">
            The message to {card.recipient_name}
          </h1>
        </div>
        {error && (
          <div className="mx-auto flex w-full max-w-md flex-col gap-12">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="mx-auto flex w-full max-w-md flex-col gap-12">
          {openAiPanel === null ? (
            <div className="flex h-9 items-center justify-center gap-2">
              <ChipButton
                onClick={() => setOpenAiPanel("image")}
                disabled={isRegeneratingImage}
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
                disabled={isRegeneratingHeadline}
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
                onChange={handleEditImageFileChange}
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
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    !isReadingImageFile && editImageFileRef.current?.click()
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
                      void handleRegenerateImageFromSidebar(
                        imagePrompt,
                        attachedImageDataUrl ?? undefined,
                      )
                      setOpenAiPanel(null)
                    }
                    if (e.key === "Escape") closeImagePanel()
                  }}
                  disabled={isRegeneratingImage}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Close image edit panel"
                  className="absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded-full"
                  onClick={closeImagePanel}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
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
                    void handleRegenerateTitleFromSidebar(titlePrompt)
                    setOpenAiPanel(null)
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

          <CardOwnerStudio
            ref={studioRef}
            key={`${cardId}-${card.recipient_email || ""}`}
            cardId={cardId}
            initialCardPage={0}
            reloadNonce={reloadNonce}
            initialSnapshot={initialData}
            initialDraftTextColor={initialDraftTextColor}
            onActiveContributionChange={setActiveContribution}
            onRegeneratingImageChange={setIsRegeneratingImage}
            onRegeneratingHeadlineChange={setIsRegeneratingHeadline}
            onCardDataChange={handleCardDataChange}
          />
        </div>
      </CardDetailLayout>

      <ContributorShareModal
        key={
          showContributorShareModal
            ? `contributor-share-${cardId}-open`
            : `contributor-share-${cardId}-closed`
        }
        cardId={cardId}
        contributorLinkId={card.contributor_link_id}
        isOpen={showContributorShareModal}
        onClose={() => setShowContributorShareModal(false)}
      />
      <RecipientShareModal
        key={
          showRecipientShareModal
            ? `recipient-share-${cardId}-open`
            : `recipient-share-${cardId}-closed`
        }
        cardId={cardId}
        recipientName={card.recipient_name}
        recipientEmail={card.recipient_email || ""}
        contributorLinkId={card.contributor_link_id}
        isOpen={showRecipientShareModal}
        onClose={() => {
          setShowRecipientShareModal(false)
          setReloadNonce((n) => (n ?? 0) + 1)
        }}
        onEmailUpdate={(email) =>
          setCard((prev) => ({ ...prev, recipient_email: email }))
        }
        onSentAtRecorded={(sentAt) =>
          setCard((prev) => ({ ...prev, sent_at: sentAt }))
        }
      />
    </>
  )
}
