"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { ShareModal } from "@/components/share-modal"
import {
  CardOwnerStudio,
  type ActiveContributionFormattingState,
} from "@/components/card-owner-studio"
import {
  Copy,
  CheckCircle2,
  Send,
  Sparkles,
  RotateCcw,
  RotateCw,
  ImagePlus,
  X,
} from "lucide-react"
import { MESSAGE_TEXT_COLOR_PRESETS } from "@/lib/message-text-color-presets"
import {
  MIN_CONTRIBUTION_ROTATION_DEGREES,
  MAX_CONTRIBUTION_ROTATION_DEGREES,
} from "@/lib/contribution-rotation"

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
  image_prompt?: string
  card_type?: string
  sent_at?: string | null
  contributor_link_id: string
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading card…</p>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
        <p className="text-xl font-semibold tracking-[-0.02em]">
          Card not found
        </p>
        <Link href="/dashboard">
          <Button variant="outline">← Back to dashboard</Button>
        </Link>
      </div>
    )
  }

  const snappedFontSize = activeContribution?.fontSize ?? 16
  const snappedRotation = activeContribution
    ? Math.round(activeContribution.rotationDegrees ?? 0)
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      {/* ── Body: editor + writing panel ── */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_420px]">
        {/* LEFT — editor stage */}
        <main className="flex flex-col gap-7 bg-background px-10 py-10 md:px-12">
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
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
              The card
            </p>
            <h1 className="mt-1.5 text-[34px] leading-none font-semibold tracking-[-0.03em]">
              The message to {card.recipient_name}.
            </h1>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Card studio */}
          <div className="mt-8 flex flex-1 justify-center">
            <CardOwnerStudio
              key={`${cardId}-${card.recipient_email || ""}`}
              cardId={cardId}
              initialCardPage={0}
              hideImageRegenerateButton
              onActiveContributionChange={setActiveContribution}
            />
          </div>
        </main>

        {/* RIGHT — writing panel */}
        <aside className="flex flex-col border-t border-border bg-muted/20 lg:border-t-0 lg:border-l">
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:p-8">
            {/* Header */}
            <div>
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                Your note
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                Format your note.
              </h2>
            </div>

            {/* Note formatting controls */}
            <div className="flex flex-col gap-6">
              {/* Refine with AI */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Refine with AI
                </p>
                <div className="flex flex-row flex-wrap gap-2">
                  {refineOpen ? (
                    <div className="flex w-full gap-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
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
                      <button
                        type="button"
                        onClick={() => setRefineOpen(true)}
                        disabled={
                          isRefining ||
                          Boolean(activeContribution?.isRegeneratingMessage)
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        Improve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleAiRefine("Make this message shorter")
                        }
                        disabled={
                          isRefining ||
                          Boolean(activeContribution?.isRegeneratingMessage)
                        }
                        className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        Shorten
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleAiRefine(
                            "Make this message warmer and more personal",
                          )
                        }
                        disabled={
                          isRefining ||
                          Boolean(activeContribution?.isRegeneratingMessage)
                        }
                        className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        Warmer
                      </button>
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
                      onClick={() =>
                        activeContribution?.onTextColorChange(color)
                      }
                      className="h-7 w-7 rounded-full border-2 transition-all"
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
                      <button
                        type="button"
                        onClick={() => activeContribution.onGifOpen()}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Change
                      </button>
                      {activeContribution.onGifClear && (
                        <button
                          type="button"
                          onClick={() => activeContribution.onGifClear?.()}
                          className="text-xs text-destructive/70 transition-colors hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => activeContribution?.onGifOpen()}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Add GIF
                  </button>
                )}
              </div>

              {/* Text size */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Text size
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {FONT_SIZE_PRESETS.map(({ px, label }) => (
                    <button
                      key={px}
                      type="button"
                      onClick={() => activeContribution?.onFontSizeChange(px)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        snappedFontSize === px
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      {label}
                    </button>
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
                    className="flex h-full items-center justify-center rounded-l-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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
                    className="flex h-full items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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
                      <button
                        key={page}
                        type="button"
                        onClick={() => activeContribution.onPageChange(page)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          activeContribution.pageIndex === page
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        ].join(" ")}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-6">
              <div className="h-px bg-border" />

              {/* Share */}
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
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copyLinkCopied ? "Link copied!" : "Copy share link"}
                  </Button>
                  <Button
                    variant="brand"
                    size="default"
                    onClick={() => setShowShareModal(true)}
                    className="w-full"
                  >
                    <Send className="mr-2 h-4 w-4" />
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
    </div>
  )
}

export default function CardDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
          <Spinner className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading card…</p>
        </div>
      }
    >
      <CardDetailInner />
    </Suspense>
  )
}
