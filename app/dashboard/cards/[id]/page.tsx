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
  CheckCircle2,
  Copy,
  ImagePlus,
  Paperclip,
  RotateCcw,
  RotateCw,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import { MESSAGE_TEXT_COLOR_PRESETS } from "@/lib/message-text-color-presets"
import {
  MIN_CONTRIBUTION_ROTATION_DEGREES,
  MAX_CONTRIBUTION_ROTATION_DEGREES,
} from "@/lib/contribution-rotation"
import { handleImageFileChange } from "@/lib/handle-image-file-change"

const FONT_SIZE_PRESETS = [
  { px: 12, label: "Tiny" },
  { px: 14, label: "Small" },
  { px: 16, label: "Medium" },
  { px: 20, label: "Large" },
  { px: 24, label: "Huge" },
] as const

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
          <Link href="/dashboard">
            <Button variant="outline" size="default">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Dashboard
            </Button>
          </Link>
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
        <aside className="flex flex-col border-t border-border bg-muted/20 lg:fixed lg:top-14 lg:right-0 lg:h-[calc(100dvh-56px)] lg:w-[420px] lg:border-t-0 lg:border-l">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 lg:p-7">
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16 rounded-sm" />
              <Skeleton className="h-7 w-40 rounded-md" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <div className="flex gap-1.5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-16 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-auto flex flex-col gap-3 pt-6">
              <div className="h-px bg-border" />
              <Skeleton className="h-3 w-12 rounded-sm" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </aside>
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
  const [refinePrompt, setRefinePrompt] = useState("")
  const [refineOpen, setRefineOpen] = useState(false)
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

  const handleAiRefine = async (prompt?: string) => {
    const p = (prompt ?? refinePrompt).trim()
    if (!activeContribution || !p) return
    setIsRefining(true)
    try {
      await activeContribution.onAiRefine(p)
      if (!prompt) setRefinePrompt("")
    } finally {
      setIsRefining(false)
    }
  }

  if (loading) {
    return <CardDetailSkeleton />
  }

  if (!card) {
    return (
      <div className="flex flex-1 items-center justify-center gap-6 p-4">
        <p className="text-xl font-semibold tracking-[-0.02em]">
          Card not found
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">← Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  const snappedFontSize = activeContribution?.fontSize ?? 16
  const snappedRotation = activeContribution
    ? Math.round(activeContribution.rotationDegrees ?? 0)
    : 0

  return (
    <>
      {/* ── Body: editor + writing panel ── */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_420px]">
        {/* LEFT — editor stage */}
        <main className="flex flex-col gap-7 px-10 py-10 md:px-12 lg:h-[calc(100dvh-56px)] lg:overflow-y-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Button variant="outline" size="default">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Dashboard
            </Button>
          </Link>
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
        <aside className="flex flex-col border-t border-border bg-muted/20 lg:fixed lg:top-14 lg:right-0 lg:h-[calc(100dvh-56px)] lg:w-[420px] lg:border-t-0 lg:border-l">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 lg:p-7">
            <div>
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                Your note
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                Format your note.
              </h2>
            </div>

            {/* Refine with AI */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Refine with AI
              </p>
              <div className="flex flex-row flex-wrap gap-2">
                {refineOpen ? (
                  <div className="flex w-full gap-2">
                    <Input
                      autoFocus
                      className="rounded-full focus-visible:ring-1"
                      placeholder="Describe the change…"
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && refinePrompt.trim()) {
                          void handleAiRefine()
                          setRefineOpen(false)
                        }
                        if (e.key === "Escape") setRefineOpen(false)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setRefineOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <ChipButton
                      onClick={() => setRefineOpen(true)}
                      disabled={
                        isRefining ||
                        Boolean(activeContribution?.isRegeneratingMessage)
                      }
                      className="gap-1.5 text-xs"
                    >
                      <Sparkles className="h-3 w-3" />
                      Improve
                    </ChipButton>
                    <ChipButton
                      onClick={() =>
                        void handleAiRefine("Make this message shorter")
                      }
                      disabled={
                        isRefining ||
                        Boolean(activeContribution?.isRegeneratingMessage)
                      }
                      className="text-xs"
                    >
                      Shorten
                    </ChipButton>
                    <ChipButton
                      onClick={() =>
                        void handleAiRefine(
                          "Make this message warmer and more personal",
                        )
                      }
                      disabled={
                        isRefining ||
                        Boolean(activeContribution?.isRegeneratingMessage)
                      }
                      className="text-xs"
                    >
                      Warmer
                    </ChipButton>
                  </>
                )}
              </div>
            </div>

            {/* Ink color */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Ink color
              </p>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEXT_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => activeContribution?.onTextColorChange(color)}
                    className="h-7 w-7 cursor-pointer rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        activeContribution?.textColor === color
                          ? "hsl(var(--brand))"
                          : "transparent",
                      boxShadow:
                        activeContribution?.textColor === color
                          ? "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--brand))"
                          : undefined,
                    }}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* GIF */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                GIF{" "}
                <span className="font-normal text-muted-foreground/60">
                  (optional)
                </span>
              </p>
              {activeContribution?.hasGif ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-border">
                    {activeContribution.giphyUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeContribution.giphyUrl}
                        alt="Attached GIF"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 text-muted-foreground"
                      onClick={() => activeContribution.onGifOpen()}
                    >
                      Change
                    </Button>
                    {activeContribution.onGifClear && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 text-destructive/70 hover:text-destructive"
                        onClick={() => activeContribution.onGifClear?.()}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <ChipButton
                  onClick={() => activeContribution?.onGifOpen()}
                  className="gap-2 self-start text-xs"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Add GIF
                </ChipButton>
              )}
            </div>

            {/* Text size */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Text size
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FONT_SIZE_PRESETS.map(({ px, label }) => (
                  <ChipButton
                    key={px}
                    onClick={() => activeContribution?.onFontSizeChange(px)}
                    active={snappedFontSize === px}
                    className="py-1 text-xs"
                  >
                    {label}
                  </ChipButton>
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Rotation
              </p>
              <div className="inline-flex h-9 w-fit items-center rounded-xl border border-border bg-background">
                <button
                  type="button"
                  disabled={
                    snappedRotation <= MIN_CONTRIBUTION_ROTATION_DEGREES
                  }
                  onClick={() =>
                    activeContribution?.onRotationChange(
                      Math.max(
                        MIN_CONTRIBUTION_ROTATION_DEGREES,
                        snappedRotation - 1,
                      ),
                    )
                  }
                  className="flex h-full cursor-pointer items-center justify-center rounded-l-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  title="Rotate counter-clockwise"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <div className="h-4 w-px bg-border" />
                <span className="min-w-12 text-center font-mono text-xs text-foreground">
                  {snappedRotation}°
                </span>
                <div className="h-4 w-px bg-border" />
                <button
                  type="button"
                  disabled={
                    snappedRotation >= MAX_CONTRIBUTION_ROTATION_DEGREES
                  }
                  onClick={() =>
                    activeContribution?.onRotationChange(
                      Math.min(
                        MAX_CONTRIBUTION_ROTATION_DEGREES,
                        snappedRotation + 1,
                      ),
                    )
                  }
                  className="flex h-full cursor-pointer items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  title="Rotate clockwise"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Page selector */}
            {activeContribution && activeContribution.totalInnerPages > 1 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Page
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(
                    { length: activeContribution.totalInnerPages },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <ChipButton
                      key={page}
                      onClick={() => activeContribution.onPageChange(page)}
                      active={activeContribution.pageIndex === page}
                      className="py-1 text-xs"
                    >
                      {page}
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}

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
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copyLinkCopied ? "Link copied!" : "Copy share link"}
                  </Button>
                  <Button
                    size="default"
                    onClick={() => setShowShareModal(true)}
                    className="w-full"
                  >
                    <Send className="h-4 w-4" />
                    Send to recipient
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
