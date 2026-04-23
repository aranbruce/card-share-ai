"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { Card3D } from "@/components/card-3d"
import { GiphyPicker } from "@/components/card-3d/giphy-picker"
import { forCardDisplay } from "@/lib/card-body"
import type { CardComposeDraft } from "@/lib/card-compose-draft"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import type { Contribution } from "@/lib/card-body"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { NotePanel } from "@/components/contribute/note-panel"

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
      setEditingContributionId(contribution.id)
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

  const maxContribPage = contributions.reduce(
    (max, c) =>
      typeof c.page_index === "number" && c.page_index >= 1
        ? Math.max(max, c.page_index)
        : max,
    0,
  )
  const totalInnerPages = Math.max(1 + (card?.extra_pages ?? 0), maxContribPage)

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
    ? "The card may already be with the recipient. You can still edit your note from this device."
    : canPlaceNewGuestMessage
      ? "Flip to the inside and click anywhere to place your note."
      : "Flip to the inside to find and edit your note."

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top nav ── */}
      <AppHeader />

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
              contributionRegeneratingId={regeneratingContributionId}
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
              suppressComposeActions
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
            <NotePanel
              title="Write something real."
              values={{
                textColor: composeValues.textColor,
                giphyUrl: composeValues.giphyUrl,
                fontSize: composeValues.fontSize,
                rotationDegrees: composeValues.rotationDegrees,
                pageIndex: composeValues.pageIndex,
              }}
              isRegenerating={composeDraftRegenerating}
              onRegenerate={handleComposeDraftRegenerate}
              onTextColorChange={(color) =>
                patchComposeValues({ textColor: color })
              }
              onFontSizeChange={(px) => patchComposeValues({ fontSize: px })}
              onRotationChange={(deg) =>
                patchComposeValues({ rotationDegrees: deg })
              }
              onPageChange={(pageNum) => {
                patchComposeValues({ pageIndex: pageNum })
                setNavigateToPage(pageNum)
              }}
              onOpenGifPicker={() => setComposeGifPickerOpen(true)}
              onGifChange={handleComposeDraftGifChange}
              totalInnerPages={totalInnerPages}
              error={error && composeDraft ? error : undefined}
              onSubmit={submitComposeDraft}
              onCancel={cancelCompose}
              submitting={submitting}
            />
          ) : editableContrib !== null ? (
            <NotePanel
              title="Edit your note."
              values={{
                textColor: editableContrib.text_color,
                giphyUrl: editableContrib.giphy_url,
                fontSize: editableContrib.font_size,
                rotationDegrees: editableContrib.rotation_degrees,
                pageIndex: editableContrib.page_index,
              }}
              isRegenerating={regeneratingContributionId === editableContrib.id}
              onRegenerate={(prompt) =>
                handleContributionRegenerateMessage(editableContrib.id, prompt)
              }
              onTextColorChange={(color) =>
                changeActiveContributionLayout({ textColor: color })
              }
              onFontSizeChange={(px) =>
                changeActiveContributionLayout({ fontSize: px })
              }
              onRotationChange={(deg) =>
                changeActiveContributionLayout({ rotationDegrees: deg })
              }
              onPageChange={(pageNum) =>
                changeActiveContributionLayout({ pageIndex: pageNum })
              }
              onOpenGifPicker={() =>
                setContribGifPickerContributionId(editableContrib.id)
              }
              onGifChange={(url) =>
                handleContributionGifChange(editableContrib.id, url)
              }
              totalInnerPages={totalInnerPages}
            />
          ) : (
            /* ── Empty state ── */
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Flip to the inside and click anywhere to place your note.
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
