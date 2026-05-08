"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { ShareModal } from "@/components/share-modal"
import {
  CardOwnerStudio,
  type ActiveContributionFormattingState,
  type CardOwnerStudioHandle,
} from "@/components/card-owner-studio"
import {
  ChevronLeft,
  CheckCircle2,
  Copy,
  FileX2,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import { handleImageFileChange } from "@/lib/handle-image-file-change"
import { NotePanel } from "@/components/note-panel"

interface CardData {
  id: string
  recipient_name: string
  recipient_email?: string
  sender_name: string
  copy_headline: string
  copy_message: string
  copy_signoff?: string
  image_url: string
  card_type?: string
  sent_at?: string | null
  contributor_link_id: string
}

function CardDetailSkeleton() {
  return (
    <>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_420px]">
        {/* LEFT */}
        <main className="flex flex-col gap-7 px-10 py-10 md:px-12 lg:h-[calc(100dvh-56px)] lg:overflow-y-auto">
          <Button asChild variant="outline" size="default">
            <Link href="/dashboard">
              <ChevronLeft />
              Dashboard
            </Link>
          </Button>
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-3 w-16 rounded-sm" />
            <Skeleton className="mx-auto h-9 w-72 rounded-md" />
          </div>
          <div className="mx-auto flex w-full max-w-md flex-col gap-12">
            <div className="flex justify-center gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton
              className="w-full rounded-2xl"
              style={{ minHeight: "500px" }}
            />
          </div>
        </main>

        {/* RIGHT */}
        <NotePanel loading />
      </div>
    </>
  )
}

function CardDetailInner() {
  const params = useParams()
  const router = useRouter()
  const cardId = params.id as string

  const supabase = useMemo(() => createClient(), [])
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copyLinkCopied, setCopyLinkCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
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

  const loadCard = useCallback(async () => {
    try {
      const response = await fetch(`/api/cards/${cardId}`)
      if (!response.ok) throw new Error("Card not found")
      const { card: cardData } = await response.json()
      setCard(cardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load card")
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      void loadCard()
    }
    void checkAuth()
  }, [router, supabase, loadCard])

  const copyContributorLink = () => {
    if (!card) return
    const link = `${window.location.origin}/contribute/${card.contributor_link_id}`
    navigator.clipboard.writeText(link)
    setCopyLinkCopied(true)
    setTimeout(() => setCopyLinkCopied(false), 2000)
  }

  const handleCardDataChange = useCallback(
    (
      updates: Partial<{
        copy_headline: string
        image_url: string
      }>,
    ) => {
      setCard((prev) => (prev ? { ...prev, ...updates } : null))
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
          if (reqId === editImageRequestRef.current) setError(msg)
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

  const handleAiRefine = async (prompt: string) => {
    if (!activeContribution || !prompt.trim()) return
    setIsRefining(true)
    try {
      await activeContribution.onAiRefine(prompt)
    } finally {
      setIsRefining(false)
    }
  }

  if (loading) {
    return <CardDetailSkeleton />
  }

  if (!card) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileX2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Card not found
            </h1>
            <p className="max-w-xs text-sm text-muted-foreground">
              This card may have been deleted or you may not have permission to
              view it.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ChevronLeft />
              Back to dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/create">Create a new card</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Body: editor + writing panel ── */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_420px]">
        {/* LEFT — editor stage */}
        <main className="flex flex-col gap-7 px-10 py-10 md:px-12 lg:h-[calc(100dvh-56px)] lg:overflow-y-auto">
          <Button asChild variant="outline" size="default">
            <Link href="/dashboard">
              <ChevronLeft />
              Dashboard
            </Link>
          </Button>
          {/* Page heading */}
          <div className="text-center">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
              The card
            </p>
            <h1 className="mt-1.5 text-[34px] leading-none font-semibold tracking-[-0.03em]">
              The message to {card.recipient_name}.
            </h1>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col gap-12">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* AI edit buttons + card — share max-w-md so input matches card width */}
          <div className="mx-auto flex w-full max-w-md flex-col gap-12">
            {openAiPanel === null ? (
              <div className="flex h-9 items-center justify-center gap-2">
                <ChipButton
                  onClick={() => setOpenAiPanel("image")}
                  disabled={isRegeneratingImage}
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
                  disabled={isRegeneratingHeadline}
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
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
                    >
                      <X className="h-3 w-3" />
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
                    className="absolute top-1/2 left-1 h-7 w-7 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
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
                      if (e.key === "Escape") {
                        editImageRequestRef.current++
                        setIsReadingImageFile(false)
                        setOpenAiPanel(null)
                        setAttachedImageDataUrl(null)
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
                      editImageRequestRef.current++
                      setIsReadingImageFile(false)
                      setOpenAiPanel(null)
                      setAttachedImageDataUrl(null)
                      if (editImageFileRef.current)
                        editImageFileRef.current.value = ""
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
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
                  className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
                  onClick={() => setOpenAiPanel(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Card studio */}
            <CardOwnerStudio
              ref={studioRef}
              key={`${cardId}-${card.recipient_email || ""}`}
              cardId={cardId}
              initialCardPage={0}
              onActiveContributionChange={setActiveContribution}
              onRegeneratingImageChange={setIsRegeneratingImage}
              onRegeneratingHeadlineChange={setIsRegeneratingHeadline}
              onCardDataChange={handleCardDataChange}
            />
          </div>
        </main>

        {/* RIGHT — note formatting panel */}
        <NotePanel
          title="Format your note."
          values={{
            textColor: activeContribution?.textColor,
            giphyUrl: activeContribution?.giphyUrl,
            fontSize: activeContribution?.fontSize,
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
          onRotationChange={(deg) => activeContribution?.onRotationChange(deg)}
          onPageChange={(page) => activeContribution?.onPageChange(page)}
          onOpenGifPicker={() => activeContribution?.onGifOpen()}
          onGifChange={(url) => {
            if (url === null) activeContribution?.onGifClear?.()
          }}
          totalInnerPages={activeContribution?.totalInnerPages ?? 1}
          footer={
            <div className="mt-auto flex flex-col gap-6">
              <div className="h-px bg-border" />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Share
                </p>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  Invite contributors with a link, or send the finished card
                  directly to {card.recipient_name}.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={copyContributorLink}
                    className="w-full"
                  >
                    {copyLinkCopied ? (
                      <CheckCircle2 className="text-green-600" />
                    ) : (
                      <Copy />
                    )}
                    {copyLinkCopied ? "Link copied!" : "Copy share link"}
                  </Button>
                  <Button
                    size="default"
                    onClick={() => setShowShareModal(true)}
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
      </div>

      <ShareModal
        cardId={cardId}
        recipientName={card.recipient_name}
        recipientEmail={card.recipient_email || ""}
        contributorLinkId={card.contributor_link_id}
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false)
          void loadCard()
        }}
        onEmailUpdate={(email) =>
          setCard((prev) => (prev ? { ...prev, recipient_email: email } : null))
        }
        onSentAtRecorded={(sentAt) =>
          setCard((prev) => (prev ? { ...prev, sent_at: sentAt } : null))
        }
      />
    </>
  )
}

export default function CardDetailPage() {
  return (
    <Suspense fallback={<CardDetailSkeleton />}>
      <CardDetailInner />
    </Suspense>
  )
}
