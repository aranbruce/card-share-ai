"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Card3D } from "@/components/card-3d"
import { forCardDisplay } from "@/lib/card-body"
import type { CardComposeDraft } from "@/lib/card-compose-draft"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import type { Contribution } from "@/lib/card-body"
import { Logo } from "@/components/logo"

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
  /** contributionId → editToken (from POST only; never exposed via GET) */
  const [contributionEditTokens, setContributionEditTokens] = useState<
    Record<string, string>
  >({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gifSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const addPageInFlightRef = useRef(false)
  const composeDraftRef = useRef<CardComposeDraft | null>(null)
  const [regeneratingContributionId, setRegeneratingContributionId] = useState<
    string | null
  >(null)

  useEffect(() => {
    composeDraftRef.current = composeDraft
  }, [composeDraft])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      gifSaveTimersRef.current.forEach(clearTimeout)
      gifSaveTimersRef.current.clear()
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

        const { card: cardData, contributions } = await response.json()
        setCard(cardData)
        setContributions(contributions)
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
          void saveContributionPatch(contributionId, { giphyUrl }, token)
        }, 200),
      )
    },
    [contributionEditTokens, saveContributionPatch],
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
      const current = composeDraftRef.current?.message ?? ""
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
        setComposeDraft((d) => (d ? { ...d, message: next } : d))
      } catch (e) {
        console.error(e)
      } finally {
        setComposeDraftRegenerating(false)
      }
    },
    [card],
  )

  const handleComposeDraftGifChange = useCallback((giphyUrl: string | null) => {
    setComposeDraft((d) => (d ? { ...d, giphyUrl } : d))
  }, [])

  const cancelCompose = useCallback(() => {
    setComposeDraft(null)
    setError("")
  }, [])

  const submitComposeDraft = useCallback(async () => {
    const draft = composeDraftRef.current
    if (!draft) return

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

  /** One note per device/session: tokens are only set after a successful POST. */
  const canPlaceNewGuestMessage = useMemo(
    () => Object.keys(contributionEditTokens).length === 0,
    [contributionEditTokens],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Card Not Found</h1>
          <p className="text-muted-foreground">
            The card you&apos;re looking for doesn&apos;t exist or has been
            sent.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-center">
        <Logo />
      </header>
      <main className="flex-1 p-4 pt-8 md:p-8 md:pt-12">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold">
              {card.sent_at ? "Sign this card" : "You're Invited!"}
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              {card.sent_at
                ? "The card may already be with the recipient — you can still add or edit your note from this device using the link you used before."
                : canPlaceNewGuestMessage
                  ? "Flip to the friends & family page and click where you want your note. Then type your message; drag and resize like when creating the card."
                  : "Flip to the friends & family page to find your note. You can edit the text, drag it, and resize it from this device."}
            </p>
          </div>

          <Card3D
            imageUrl={card.image_url}
            headline={card.copy_headline}
            message={bodyMessage}
            senderName={card.sender_name || "Someone special"}
            recipientName={card.recipient_name || "You"}
            contributions={displayContributions}
            extraPages={card.extra_pages || 0}
            onAddPage={handleAddPage}
            hideEmptyCenterMessageBody={true}
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
                    setComposeDraft({
                      message: "",
                      giphyUrl: null,
                      x: pt.x,
                      y: pt.y,
                      pageIndex: pt.pageIndex,
                      textColor: randomPresetTextColor(),
                      rotationDegrees: 0,
                    })
                  }
                : undefined
            }
            onComposeSubmit={submitComposeDraft}
            onComposeCancel={cancelCompose}
            composeSubmitting={submitting}
            composeError={composeDraft ? error : null}
            onComposeDraftRegenerateMessage={handleComposeDraftRegenerate}
            onComposeDraftGifChange={handleComposeDraftGifChange}
            composeDraftRegenerating={composeDraftRegenerating}
          />
        </div>
      </main>
    </div>
  )
}
