"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { Card3D } from "@/components/card-3d"
import { GiphyPicker } from "@/components/card-3d/giphy-picker"
import { forCardDisplay } from "@/lib/card-body"
import type { CardComposeDraft } from "@/lib/card-compose-draft"
import {
  randomPresetTextColor,
  MESSAGE_TEXT_COLOR_PRESETS,
} from "@/lib/message-text-color-presets"
import type { Contribution } from "@/lib/card-body"
import Image from "next/image"
import Link from "next/link"
import { Logo } from "@/components/logo"
import {
  Sparkles,
  ImagePlus,
  X,
  ArrowUp,
  RotateCcw,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface CardData {
  id: string
  card_type: string
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  sent_at?: string | null
  extra_pages?: number
}

const FONT_SIZE_PRESETS = [
  { px: 12, label: "Tiny" },
  { px: 14, label: "Small" },
  { px: 16, label: "Medium" },
  { px: 20, label: "Large" },
  { px: 24, label: "Huge" },
] as const

export default function ContributeCardPage() {
  const params = useParams()
  const linkId = params.linkId as string

  const [card, setCard] = useState<CardData | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitNonce, setSubmitNonce] = useState(0)
  const [composeDraft, setComposeDraft] = useState<CardComposeDraft | null>(
    null,
  )
  const [composeDraftRegenerating, setComposeDraftRegenerating] =
    useState(false)
  const [contributionEditTokens, setContributionEditTokens] = useState<
    Record<string, string>
  >({})
  // Panel-only compose state — used before the user clicks to place the note
  // on the canvas. Once placed, composeDraft holds the full values.
  const [preComposeDraft, setPreComposeDraft] = useState(() => ({
    message: "",
    giphyUrl: null as string | null,
    textColor: randomPresetTextColor(),
    fontSize: undefined as number | undefined,
    rotationDegrees: 0,
    pageIndex: 1,
  }))
  const preComposeDraftRef = useRef(preComposeDraft)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gifSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )
  const addPageInFlightRef = useRef(false)
  const composeDraftRef = useRef<CardComposeDraft | null>(null)
  const [regeneratingContributionId, setRegeneratingContributionId] = useState<
    string | null
  >(null)

  // Panel state
  const [editingContributionId, setEditingContributionId] = useState<
    string | null
  >(null)
  const [navigateToPage, setNavigateToPage] = useState<number | undefined>(
    undefined,
  )
  const [refinePrompt, setRefinePrompt] = useState("")
  const [refineOpen, setRefineOpen] = useState(false)
  const [composeGifPickerOpen, setComposeGifPickerOpen] = useState(false)
  const [contribGifPickerContributionId, setContribGifPickerContributionId] =
    useState<string | null>(null)

  useEffect(() => {
    preComposeDraftRef.current = preComposeDraft
  }, [preComposeDraft])

  useEffect(() => {
    composeDraftRef.current = composeDraft
  }, [composeDraft])

  // Auto-select the user's existing contribution so the panel is immediately
  // active when they return to a card they've already signed.
  useEffect(() => {
    const tokenIds = Object.keys(contributionEditTokens)
    if (tokenIds.length === 0 || editingContributionId) return
    const match = contributions.find((c) => tokenIds.includes(c.id))
    if (match) setEditingContributionId(match.id)
  }, [contributionEditTokens, contributions, editingContributionId])

  // Unified compose values — panel always reads from here regardless of placement
  const composeValues = composeDraft ?? preComposeDraft

  const patchComposeValues = useCallback(
    (patch: Partial<typeof preComposeDraft>) => {
      if (composeDraftRef.current !== null) {
        setComposeDraft((d) => (d ? { ...d, ...patch } : null))
      } else {
        setPreComposeDraft((d) => ({ ...d, ...patch }))
      }
    },
    [],
  )

  useEffect(() => {
    const gifTimers = gifSaveTimersRef.current
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      gifTimers.forEach(clearTimeout)
      gifTimers.clear()
    }
  }, [linkId])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`contribute_tokens_${linkId}`)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const next: Record<string, string> = {}
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof k === "string" && typeof v === "string" && v.trim()) {
              next[k] = v
            }
          }
          if (Object.keys(next).length > 0) {
            setContributionEditTokens(next)
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [linkId])

  useEffect(() => {
    const loadCard = async () => {
      try {
        const response = await fetch(`/api/contribute/${linkId}`)
        if (!response.ok) throw new Error("Card not found")
        const { card: cardData, contributions: contribData } =
          await response.json()
        setCard(cardData)
        setContributions(contribData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load card")
      } finally {
        setLoading(false)
      }
    }
    loadCard()
  }, [linkId])

  const handleAddPage = useCallback(async () => {
    if (addPageInFlightRef.current) return
    addPageInFlightRef.current = true
    try {
      const response = await fetch(`/api/contribute/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_page" }),
      })
      if (!response.ok) throw new Error("Failed to add page")
      const { extra_pages } = (await response.json()) as {
        extra_pages?: number
      }
      if (typeof extra_pages === "number") {
        setCard((prev) => (prev ? { ...prev, extra_pages } : prev))
      }
    } finally {
      addPageInFlightRef.current = false
    }
  }, [linkId])

  const saveContributionPatch = useCallback(
    async (
      contributionId: string,
      updates: {
        message?: string
        giphyUrl?: string | null
        positionX?: number
        positionY?: number
        widthPercent?: number
        pageIndex?: number
        fontSize?: number
        textColor?: string | null
        rotationDegrees?: number | null
      },
      editToken: string,
    ) => {
      const response = await fetch(`/api/contribute/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, editToken, ...updates }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.error(
          "Failed to save contribution",
          typeof payload.error === "string" ? payload.error : payload,
        )
        return
      }
      if (Array.isArray(payload.contributions)) {
        setContributions(payload.contributions as Contribution[])
      }
      if (typeof payload.extra_pages === "number") {
        setCard((prev) =>
          prev ? { ...prev, extra_pages: payload.extra_pages } : prev,
        )
      }
    },
    [linkId],
  )

  const handleContributionEdit = useCallback(
    (contributionId: string, value: string) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, message: value } : c,
        ),
      )
      const token = contributionEditTokens[contributionId]
      if (!token) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void saveContributionPatch(contributionId, { message: value }, token)
      }, 600)
    },
    [contributionEditTokens, saveContributionPatch],
  )

  const handleContributionGifChange = useCallback(
    (contributionId: string, giphyUrl: string | null) => {
      const currentMessage =
        contributions.find((c) => c.id === contributionId)?.message ?? null
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, giphy_url: giphyUrl } : c,
        ),
      )
      const token = contributionEditTokens[contributionId]
      if (!token) return
      const existing = gifSaveTimersRef.current.get(contributionId)
      if (existing) clearTimeout(existing)
      gifSaveTimersRef.current.set(
        contributionId,
        setTimeout(() => {
          gifSaveTimersRef.current.delete(contributionId)
          void saveContributionPatch(
            contributionId,
            { giphyUrl, ...(currentMessage && { message: currentMessage }) },
            token,
          )
        }, 200),
      )
    },
    [contributionEditTokens, contributions, saveContributionPatch],
  )

  const handleContributionLayoutChange = useCallback(
    (
      contributionId: string,
      layout: {
        x: number
        y: number
        widthPercent: number
        pageIndex: number
        fontSize?: number
        textColor?: string | null
        rotationDegrees?: number | null
      },
    ) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId
            ? {
                ...c,
                position_x: layout.x,
                position_y: layout.y,
                width_percent: layout.widthPercent,
                page_index: layout.pageIndex,
                font_size: layout.fontSize ?? c.font_size,
                text_color:
                  layout.textColor === undefined
                    ? c.text_color
                    : layout.textColor,
                rotation_degrees:
                  layout.rotationDegrees === undefined
                    ? c.rotation_degrees
                    : layout.rotationDegrees,
              }
            : c,
        ),
      )
      const token = contributionEditTokens[contributionId]
      if (!token) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void saveContributionPatch(
          contributionId,
          {
            positionX: layout.x,
            positionY: layout.y,
            widthPercent: layout.widthPercent,
            pageIndex: layout.pageIndex,
            fontSize: layout.fontSize,
            ...(layout.textColor !== undefined && {
              textColor: layout.textColor,
            }),
            ...(layout.rotationDegrees !== undefined && {
              rotationDegrees: layout.rotationDegrees,
            }),
          },
          token,
        )
      }, 200)
    },
    [contributionEditTokens, saveContributionPatch],
  )

  const changeActiveContributionLayout = useCallback(
    (patch: {
      fontSize?: number
      textColor?: string | null
      rotationDegrees?: number | null
      pageIndex?: number
    }) => {
      if (!editingContributionId) return
      const contrib = contributions.find((c) => c.id === editingContributionId)
      if (!contrib) return
      handleContributionLayoutChange(editingContributionId, {
        x: contrib.position_x ?? 10,
        y: contrib.position_y ?? 10,
        widthPercent: contrib.width_percent ?? 75,
        pageIndex:
          patch.pageIndex !== undefined
            ? patch.pageIndex
            : (contrib.page_index ?? 1),
        fontSize:
          patch.fontSize !== undefined
            ? patch.fontSize
            : (contrib.font_size ?? undefined),
        textColor:
          patch.textColor !== undefined ? patch.textColor : contrib.text_color,
        rotationDegrees:
          patch.rotationDegrees !== undefined
            ? patch.rotationDegrees
            : contrib.rotation_degrees,
      })
      if (patch.pageIndex !== undefined) {
        setNavigateToPage(patch.pageIndex)
      }
    },
    [editingContributionId, contributions, handleContributionLayoutChange],
  )

  const handleContributionRegenerateMessage = useCallback(
    async (contributionId: string, prompt: string) => {
      if (!card) return
      const token = contributionEditTokens[contributionId]
      if (!token) return
      const current =
        contributions.find((c) => c.id === contributionId)?.message ?? ""
      setRegeneratingContributionId(contributionId)
      try {
        const response = await fetch("/api/regenerate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field: "contribution_message",
            cardType: card.card_type || "custom",
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            currentValue: current,
            userPrompt: prompt,
          }),
        })
        if (!response.ok) throw new Error("Failed to refine message")
        const { text } = (await response.json()) as { text?: string }
        const next = String(text ?? "").trim()
        setContributions((prev) =>
          prev.map((c) =>
            c.id === contributionId ? { ...c, message: next } : c,
          ),
        )
        await saveContributionPatch(contributionId, { message: next }, token)
      } catch (e) {
        console.error(e)
      } finally {
        setRegeneratingContributionId(null)
      }
    },
    [card, contributionEditTokens, contributions, saveContributionPatch],
  )

  const handleComposeDraftRegenerate = useCallback(
    async (prompt: string) => {
      if (!card) return
      const current =
        composeDraftRef.current?.message ?? preComposeDraftRef.current.message
      setComposeDraftRegenerating(true)
      try {
        const response = await fetch("/api/regenerate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field: "contribution_message",
            cardType: card.card_type || "custom",
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            currentValue: current,
            userPrompt: prompt,
          }),
        })
        if (!response.ok) throw new Error("Failed to refine message")
        const { text } = (await response.json()) as { text?: string }
        const next = String(text ?? "").trim()
        patchComposeValues({ message: next })
      } catch (e) {
        console.error(e)
      } finally {
        setComposeDraftRegenerating(false)
      }
    },
    [card, patchComposeValues],
  )

  const handleComposeDraftGifChange = useCallback(
    (giphyUrl: string | null) => {
      patchComposeValues({ giphyUrl })
    },
    [patchComposeValues],
  )

  const cancelCompose = useCallback(() => {
    setComposeDraft(null)
    setPreComposeDraft((d) => ({ ...d, message: "", giphyUrl: null }))
    setError("")
  }, [])

  const submitComposeDraft = useCallback(async () => {
    // Use the placed canvas draft, or fall back to pre-compose values at a
    // default position if the user never clicked to place the note.
    const placed = composeDraftRef.current
    const pre = preComposeDraftRef.current
    const draft: CardComposeDraft = placed ?? {
      message: pre.message,
      giphyUrl: pre.giphyUrl,
      textColor: pre.textColor,
      fontSize: pre.fontSize,
      rotationDegrees: pre.rotationDegrees,
      x: 10,
      y: 15,
      pageIndex: 1,
    }

    setSubmitting(true)
    setError("")

    const msg = draft.message.trim()
    if (!msg && !draft.giphyUrl) {
      setError("Please add a message or GIF")
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/contribute/${linkId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          giphyUrl: draft.giphyUrl ?? null,
          positionX: draft.x,
          positionY: draft.y,
          widthPercent: draft.widthPercent ?? 75,
          pageIndex: draft.pageIndex,
          fontSize: draft.fontSize,
          textColor: draft.textColor,
          rotationDegrees: draft.rotationDegrees,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to add contribution",
        )
      }

      const {
        contribution,
        editToken,
        contributions: allContributions,
        extra_pages,
      } = payload as {
        contribution?: Contribution
        editToken?: string
        contributions?: Contribution[]
        extra_pages?: number
      }
      const token = typeof editToken === "string" ? editToken.trim() : ""
      const ok =
        contribution &&
        typeof contribution.id === "string" &&
        contribution.id.length > 0 &&
        token.length > 0

      if (!ok) {
        setError(
          "Your message could not be fully saved on this device. Please try again.",
        )
        return
      }

      if (Array.isArray(allContributions)) {
        setContributions(allContributions)
      } else {
        setContributions((prev) => [...prev, contribution])
      }
      setSubmitNonce((n) => n + 1)
      if (typeof extra_pages === "number") {
        setCard((prev) => (prev ? { ...prev, extra_pages } : prev))
      }
      setContributionEditTokens((prev) => {
        const next = { ...prev, [contribution.id]: token }
        try {
          sessionStorage.setItem(
            `contribute_tokens_${linkId}`,
            JSON.stringify(next),
          )
        } catch {
          /* ignore */
        }
        return next
      })
      setComposeDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add message")
    } finally {
      setSubmitting(false)
    }
  }, [linkId])

  const { bodyMessage, displayContributions } = useMemo(
    () =>
      card
        ? forCardDisplay(contributions, card.copy_message)
        : { bodyMessage: "", displayContributions: [] as Contribution[] },
    [contributions, card],
  )

  const canPlaceNewGuestMessage = useMemo(
    () => Object.keys(contributionEditTokens).length === 0,
    [contributionEditTokens],
  )

  const editableContrib = useMemo(
    () =>
      editingContributionId &&
      contributionEditTokens[editingContributionId] &&
      contributions.find((c) => c.id === editingContributionId)
        ? contributions.find((c) => c.id === editingContributionId)!
        : null,
    [editingContributionId, contributionEditTokens, contributions],
  )

  const totalInnerPages = 1 + (card?.extra_pages ?? 0)

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
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Go home
        </Link>
      </div>
    )
  }

  const instructionLine = card.sent_at
    ? "The card may already be with the recipient — you can still edit your note from this device."
    : canPlaceNewGuestMessage
      ? "Flip to the inside and click anywhere to place your note."
      : "Flip to the inside to find and edit your note."

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex w-full items-center justify-between px-6">
          <Logo />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_420px]">
        {/* ── Left: card ── */}
        <section className="flex flex-col items-center px-4 py-10 md:px-8 md:py-14">
          <div className="w-full max-w-xl space-y-8">
            {/* Page heading */}
            <div>
              <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                {card.sent_at
                  ? "Sign the card"
                  : `From ${card.sender_name || "someone special"}`}
              </p>
              <h1 className="mt-1.5 text-[34px] leading-none font-semibold tracking-[-0.03em]">
                {card.sent_at
                  ? "Add your note."
                  : `Sign ${card.recipient_name}'s card.`}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {instructionLine}
              </p>
            </div>

            {/* Card */}
            <Card3D
              imageUrl={card.image_url}
              headline={card.copy_headline}
              message={bodyMessage}
              senderName={card.sender_name || "Someone special"}
              recipientName={card.recipient_name || "You"}
              contributions={displayContributions}
              extraPages={card.extra_pages || 0}
              onAddPage={handleAddPage}
              hideEmptyCenterMessageBody
              contributeSubmitNonce={submitNonce}
              editableContributionIds={Object.keys(contributionEditTokens)}
              onContributionEdit={handleContributionEdit}
              onContributionGifChange={handleContributionGifChange}
              onContributionLayoutChange={handleContributionLayoutChange}
              onContributionRegenerateMessage={
                handleContributionRegenerateMessage
              }
              contributionRegeneratingId={regeneratingContributionId}
              composePageBump={canPlaceNewGuestMessage ? 1 : 0}
              composeDraft={composeDraft}
              onComposeDraftChange={(patch) =>
                setComposeDraft((d) => (d ? { ...d, ...patch } : d))
              }
              onComposeCanvasPlace={
                canPlaceNewGuestMessage
                  ? (pt) => {
                      const pre = preComposeDraftRef.current
                      setComposeDraft({
                        message: pre.message,
                        giphyUrl: pre.giphyUrl,
                        textColor: pre.textColor,
                        fontSize: pre.fontSize,
                        rotationDegrees: pre.rotationDegrees,
                        x: pt.x,
                        y: pt.y,
                        pageIndex: pt.pageIndex,
                      })
                    }
                  : undefined
              }
              onComposeSubmit={submitComposeDraft}
              onComposeCancel={cancelCompose}
              composeSubmitting={submitting}
              composeError={null}
              onComposeDraftRegenerateMessage={handleComposeDraftRegenerate}
              onComposeDraftGifChange={handleComposeDraftGifChange}
              composeDraftRegenerating={composeDraftRegenerating}
              suppressComposeDraftToolbar
              suppressComposeActions
              suppressFormattingToolbar
              onEditingContributionChange={(id) => {
                if (id !== null) setEditingContributionId(id)
              }}
              navigateToPage={navigateToPage}
            />
          </div>
        </section>

        {/* ── Right: writing panel ── */}
        <aside className="flex flex-col border-t border-border bg-muted/20 lg:border-t-0 lg:border-l">
          {canPlaceNewGuestMessage ? (
            /* ── Compose panel ── */
            <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
              <div>
                <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                  Your note
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                  Write something real.
                </h2>
              </div>

              {error && composeDraft && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* AI refine */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Refine with AI
                </p>
                <div className="flex flex-wrap gap-2">
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
                            void handleComposeDraftRegenerate(refinePrompt)
                            setRefinePrompt("")
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
                        onClick={() => setRefineOpen(true)}
                        disabled={composeDraftRegenerating}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        Improve
                      </button>
                      <button
                        onClick={() =>
                          void handleComposeDraftRegenerate(
                            "Make this message shorter",
                          )
                        }
                        disabled={composeDraftRegenerating}
                        className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        Shorten
                      </button>
                      <button
                        onClick={() =>
                          void handleComposeDraftRegenerate(
                            "Make this message warmer and more personal",
                          )
                        }
                        disabled={composeDraftRegenerating}
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
                      onClick={() => patchComposeValues({ textColor: color })}
                      className="h-7 w-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor:
                          composeValues.textColor === color
                            ? "hsl(var(--brand))"
                            : "transparent",
                        boxShadow:
                          composeValues.textColor === color
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
                {composeValues.giphyUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={composeValues.giphyUrl}
                        alt="Attached GIF"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setComposeGifPickerOpen(true)}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => handleComposeDraftGifChange(null)}
                        className="text-xs text-destructive/70 transition-colors hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setComposeGifPickerOpen(true)}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Add GIF
                  </button>
                )}
              </div>

              {/* Font size */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Text size
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {FONT_SIZE_PRESETS.map(({ px, label }) => (
                    <button
                      key={px}
                      onClick={() => patchComposeValues({ fontSize: px })}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        (composeValues.fontSize ?? 16) === px
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
                    disabled={(composeValues.rotationDegrees ?? 0) <= -12}
                    onClick={() =>
                      patchComposeValues({
                        rotationDegrees: Math.max(
                          -12,
                          (composeValues.rotationDegrees ?? 0) - 1,
                        ),
                      })
                    }
                    className="flex h-full items-center justify-center rounded-l-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    title="Rotate counter-clockwise"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-4 w-px bg-border" />
                  <span className="min-w-12 text-center font-mono text-xs text-foreground">
                    {composeValues.rotationDegrees ?? 0}°
                  </span>
                  <div className="h-4 w-px bg-border" />
                  <button
                    type="button"
                    disabled={(composeValues.rotationDegrees ?? 0) >= 12}
                    onClick={() =>
                      patchComposeValues({
                        rotationDegrees: Math.min(
                          12,
                          (composeValues.rotationDegrees ?? 0) + 1,
                        ),
                      })
                    }
                    className="flex h-full items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    title="Rotate clockwise"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Page selector */}
              {totalInnerPages > 1 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Page
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(
                      { length: totalInnerPages },
                      (_, i) => i + 1,
                    ).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => {
                          patchComposeValues({ pageIndex: pageNum })
                          setNavigateToPage(pageNum)
                        }}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          (composeValues.pageIndex ?? 1) === pageNum
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        ].join(" ")}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit / cancel */}
              <div className="mt-auto flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={cancelCompose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-brand text-white hover:bg-brand/90"
                  onClick={() => void submitComposeDraft()}
                  disabled={submitting || composeDraftRegenerating}
                >
                  {submitting ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  Add my note
                </Button>
              </div>
            </div>
          ) : editableContrib !== null ? (
            /* ── Edit existing contribution panel ── */
            <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
              <div>
                <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
                  Your note
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                  Edit your note.
                </h2>
              </div>

              {/* AI chips */}
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
                            void handleContributionRegenerateMessage(
                              editableContrib.id,
                              refinePrompt,
                            )
                            setRefinePrompt("")
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
                        onClick={() => setRefineOpen(true)}
                        disabled={
                          regeneratingContributionId === editableContrib.id
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        Improve
                      </button>
                      <button
                        onClick={() =>
                          void handleContributionRegenerateMessage(
                            editableContrib.id,
                            "Make this message shorter",
                          )
                        }
                        disabled={
                          regeneratingContributionId === editableContrib.id
                        }
                        className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
                      >
                        Shorten
                      </button>
                      <button
                        onClick={() =>
                          void handleContributionRegenerateMessage(
                            editableContrib.id,
                            "Make this message warmer and more personal",
                          )
                        }
                        disabled={
                          regeneratingContributionId === editableContrib.id
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
                      onClick={() =>
                        changeActiveContributionLayout({ textColor: color })
                      }
                      className="h-7 w-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor:
                          editableContrib.text_color === color
                            ? "hsl(var(--brand))"
                            : "transparent",
                        boxShadow:
                          editableContrib.text_color === color
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
                {editableContrib.giphy_url ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={editableContrib.giphy_url}
                        alt="Attached GIF"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setContribGifPickerContributionId(editableContrib.id)
                        }
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Change
                      </button>
                      <button
                        onClick={() =>
                          handleContributionGifChange(editableContrib.id, null)
                        }
                        className="text-xs text-destructive/70 transition-colors hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setContribGifPickerContributionId(editableContrib.id)
                    }
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
                      onClick={() =>
                        changeActiveContributionLayout({ fontSize: px })
                      }
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        (editableContrib.font_size ?? 16) === px
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page selector */}
              {totalInnerPages > 1 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Page
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(
                      { length: totalInnerPages },
                      (_, i) => i + 1,
                    ).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() =>
                          changeActiveContributionLayout({
                            pageIndex: pageNum,
                          })
                        }
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          (editableContrib.page_index ?? 1) === pageNum
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        ].join(" ")}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {canPlaceNewGuestMessage
                    ? "Flip to the inside and click anywhere to place your note."
                    : "Select your note on the card to edit it."}
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* GIF pickers */}
      <GiphyPicker
        open={composeGifPickerOpen}
        onOpenChange={setComposeGifPickerOpen}
        selectedUrl={composeValues.giphyUrl ?? null}
        onSelect={(url) => {
          handleComposeDraftGifChange(url)
          setComposeGifPickerOpen(false)
        }}
      />
      <GiphyPicker
        open={Boolean(contribGifPickerContributionId)}
        onOpenChange={(open) => {
          if (!open) setContribGifPickerContributionId(null)
        }}
        selectedUrl={
          contribGifPickerContributionId
            ? (contributions.find(
                (c) => c.id === contribGifPickerContributionId,
              )?.giphy_url ?? null)
            : null
        }
        onSelect={(url) => {
          if (contribGifPickerContributionId) {
            handleContributionGifChange(contribGifPickerContributionId, url)
          }
          setContribGifPickerContributionId(null)
        }}
      />
    </div>
  )
}
