"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card3D } from "@/components/card-3d"
import type { CardComposeDraft } from "@/lib/card-compose-draft"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import { Spinner } from "@/components/ui/spinner"

export type OwnerCard = {
  id: string
  card_type?: string
  recipient_name: string
  recipient_email?: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  image_prompt?: string | null
  extra_pages?: number
  contributor_link_id?: string
}

export type OwnerContribution = {
  id: string
  message: string
  created_at: string
  position_x?: number | null
  position_y?: number | null
  width_percent?: number | null
  page_index?: number | null
  font_size?: number | null
  text_color?: string | null
  rotation_degrees?: number | null
  is_creator?: boolean | null
}

export type CardOwnerStudioProps = {
  cardId: string
  /** 0 = cover; 1 = first inside spread (e.g. after creating a card). */
  initialCardPage?: number
  /** Called after the owner’s first compose save updates `copy_message`. */
  onOwnerComposeSaved?: () => void
}

export function CardOwnerStudio({
  cardId,
  initialCardPage = 0,
  onOwnerComposeSaved,
}: CardOwnerStudioProps) {
  const [card, setCard] = useState<OwnerCard | null>(null)
  const [contributions, setContributions] = useState<OwnerContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [composeError, setComposeError] = useState("")
  const [submitNonce, setSubmitNonce] = useState(0)
  const [composeDraft, setComposeDraft] = useState<CardComposeDraft | null>(
    null,
  )
  const [composeDraftRegenerating, setComposeDraftRegenerating] =
    useState(false)
  const [regeneratingContributionId, setRegeneratingContributionId] = useState<
    string | null
  >(null)
  const [isRegeneratingHeadline, setIsRegeneratingHeadline] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const headlineSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const ownerMessageSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const ownerLayoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const composeDraftRef = useRef<CardComposeDraft | null>(null)

  useEffect(() => {
    composeDraftRef.current = composeDraft
  }, [composeDraft])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
        credentials: "same-origin",
        cache: "no-store",
      })
      if (res.status === 401) {
        throw new Error("You need to be signed in to open this card.")
      }
      if (!res.ok) throw new Error("Card not found")
      const { card: c, contributions: list } = (await res.json()) as {
        card: OwnerCard
        contributions?: OwnerContribution[]
      }
      setCard(c)
      setContributions(list ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => {
    void load()
  }, [load])

  const creatorRow = useMemo(
    () => contributions.find((c) => Boolean(c.is_creator)),
    [contributions],
  )

  const editableContributionIds = useMemo(
    () => (creatorRow ? [creatorRow.id] : []),
    [creatorRow],
  )

  const creatorMessageSaved = Boolean(creatorRow?.message?.trim())

  const saveOwnerContributionPatch = useCallback(
    async (
      contributionId: string,
      updates: {
        message?: string
        positionX?: number
        positionY?: number
        widthPercent?: number
        pageIndex?: number
        fontSize?: number
        textColor?: string | null
        rotationDegrees?: number | null
      },
    ) => {
      const res = await fetch(`/api/cards/${cardId}/contributions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, ...updates }),
      })
      if (!res.ok) {
        const p = await res.json().catch(() => ({}))
        console.error(
          "Owner contribution save failed",
          typeof p.error === "string" ? p.error : p,
        )
      }
    },
    [cardId],
  )

  const handleContributionEdit = useCallback(
    (contributionId: string, value: string) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, message: value } : c,
        ),
      )
      if (!creatorRow || contributionId !== creatorRow.id) return
      if (ownerMessageSaveTimerRef.current)
        clearTimeout(ownerMessageSaveTimerRef.current)
      ownerMessageSaveTimerRef.current = setTimeout(() => {
        void saveOwnerContributionPatch(contributionId, { message: value })
      }, 600)
    },
    [creatorRow, saveOwnerContributionPatch],
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
      if (!creatorRow || contributionId !== creatorRow.id) return
      if (ownerLayoutSaveTimerRef.current)
        clearTimeout(ownerLayoutSaveTimerRef.current)
      ownerLayoutSaveTimerRef.current = setTimeout(() => {
        void saveOwnerContributionPatch(contributionId, {
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
        })
      }, 200)
    },
    [creatorRow, saveOwnerContributionPatch],
  )

  const handleContributionRegenerateMessage = useCallback(
    async (contributionId: string, prompt: string) => {
      if (!card || !creatorRow || contributionId !== creatorRow.id) return
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
        await saveOwnerContributionPatch(contributionId, { message: next })
      } catch (e) {
        console.error(e)
      } finally {
        setRegeneratingContributionId(null)
      }
    },
    [card, creatorRow, contributions, saveOwnerContributionPatch],
  )

  const handleComposeDraftRegenerate = useCallback(
    async (prompt: string) => {
      if (!card) return
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
            currentValue: composeDraftRef.current?.message ?? "",
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

  const patchCardFields = useCallback(
    async (updates: Record<string, unknown>) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const p = await res.json().catch(() => ({}))
        throw new Error(typeof p.error === "string" ? p.error : "Save failed")
      }
      const { card: next } = await res.json()
      // Prefer the PATCH response for every field the server returns. Only fill in
      // from `updates` when the returned row omits a property entirely (e.g. very
      // large `image_url` stripped from JSON) so we do not overwrite a processed
      // value such as a CDN URL with the client-sent data URL. Explicit `null` from
      // the server is kept as authoritative.
      setCard((prev) => {
        if (!next) return prev
        const merged = { ...(prev ?? {}), ...next } as OwnerCard
        const serverRow = next as Record<string, unknown>
        for (const [k, v] of Object.entries(updates)) {
          if (v === undefined) continue
          if (!Object.hasOwn(serverRow, k)) {
            ;(merged as Record<string, unknown>)[k] = v
          }
        }
        return merged
      })
    },
    [cardId],
  )

  const handleHeadlineChange = useCallback(
    (value: string) => {
      setCard((c) => (c ? { ...c, copy_headline: value } : c))
      if (headlineSaveTimerRef.current)
        clearTimeout(headlineSaveTimerRef.current)
      headlineSaveTimerRef.current = setTimeout(() => {
        void patchCardFields({ copy_headline: value }).catch(console.error)
      }, 600)
    },
    [patchCardFields],
  )

  const handleRegenerateHeadline = useCallback(
    async (prompt: string) => {
      if (!card) return
      setIsRegeneratingHeadline(true)
      try {
        const response = await fetch("/api/regenerate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "headline",
          cardType: card.card_type || "custom",
          recipientName: card.recipient_name,
          senderName: card.sender_name,
          currentValue: card.copy_headline,
          userPrompt: prompt,
          coverImagePrompt: card.image_prompt ?? "",
        }),
        })
        if (!response.ok) throw new Error("Failed")
        const { text } = (await response.json()) as { text?: string }
        const next = String(text ?? "").trim()
        setCard((c) => (c ? { ...c, copy_headline: next } : c))
        await patchCardFields({ copy_headline: next })
      } catch (e) {
        console.error(e)
      } finally {
        setIsRegeneratingHeadline(false)
      }
    },
    [card, patchCardFields],
  )

  const handleRegenerateImage = useCallback(
    async (prompt: string, sourceImageUrl?: string) => {
      if (!card) return
      setIsRegeneratingImage(true)
      try {
        const newPrompt = prompt || card.image_prompt || ""
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePrompt: newPrompt,
            coverHeadline: card.copy_headline,
            ...(sourceImageUrl ? { sourceImageUrl } : {}),
          }),
        })
        if (!response.ok) throw new Error("Failed")
        const { imageUrl } = (await response.json()) as { imageUrl?: string }
        if (imageUrl) {
          setCard((c) =>
            c ? { ...c, image_url: imageUrl, image_prompt: newPrompt } : c,
          )
          await patchCardFields({
            image_url: imageUrl,
            image_prompt: newPrompt,
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsRegeneratingImage(false)
      }
    },
    [card, patchCardFields],
  )

  const addExtraPageInFlightRef = useRef(false)

  const handleAddPage = useCallback(async () => {
    if (addExtraPageInFlightRef.current) return
    addExtraPageInFlightRef.current = true
    const next = (card?.extra_pages ?? 0) + 1
    try {
      await patchCardFields({ extra_pages: next })
    } catch (e) {
      console.error(e)
    } finally {
      addExtraPageInFlightRef.current = false
    }
  }, [card?.extra_pages, patchCardFields])

  const cancelCompose = useCallback(() => {
    setComposeDraft(null)
    setComposeError("")
  }, [])

  const submitComposeDraft = useCallback(async () => {
    const draft = composeDraftRef.current
    if (!draft) return

    setSubmitting(true)
    setComposeError("")
    const msg = draft.message.trim()
    if (!msg) {
      setComposeError("Please enter a message")
      setSubmitting(false)
      return
    }

    const hadCreatorMessage = creatorMessageSaved

    try {
      if (creatorRow) {
        const res = await fetch(`/api/cards/${cardId}/contributions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributionId: creatorRow.id,
            message: msg,
            positionX: draft.x,
            positionY: draft.y,
            widthPercent: draft.widthPercent ?? 75,
            pageIndex: draft.pageIndex,
            fontSize: draft.fontSize,
            ...(draft.textColor !== undefined
              ? { textColor: draft.textColor }
              : {}),
            ...(draft.rotationDegrees !== undefined
              ? { rotationDegrees: draft.rotationDegrees }
              : {}),
          }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to save message",
          )
        }
        const { contribution: updated } = payload as {
          contribution?: OwnerContribution
        }
        if (updated) {
          setContributions((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          )
          setSubmitNonce((n) => n + 1)
          setCard((c) => (c ? { ...c, copy_message: updated.message } : c))
        }
      } else {
        const res = await fetch(`/api/cards/${cardId}/contributions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            positionX: draft.x,
            positionY: draft.y,
            widthPercent: draft.widthPercent ?? 75,
            pageIndex: draft.pageIndex,
            fontSize: draft.fontSize,
            textColor: draft.textColor,
            rotationDegrees: draft.rotationDegrees,
          }),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to add message",
          )
        }
        const { contribution } = payload as {
          contribution?: OwnerContribution
        }
        if (contribution) {
          setContributions((prev) => [...prev, contribution])
          setSubmitNonce((n) => n + 1)
          setCard((c) => (c ? { ...c, copy_message: contribution.message } : c))
        }
      }
      setComposeDraft(null)
      if (!hadCreatorMessage) {
        onOwnerComposeSaved?.()
      }
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : "Failed to add message")
    } finally {
      setSubmitting(false)
    }
  }, [cardId, creatorRow, creatorMessageSaved, onOwnerComposeSaved])

  if (loading || !card) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        {loading ? <Spinner className="h-8 w-8" /> : null}
        {!loading && !card ? (
          <p className="text-sm text-muted-foreground">Card not found</p>
        ) : null}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  const showCompose = !creatorRow

  return (
    <div className="w-full space-y-6">
      <Card3D
        key={`${cardId}-${initialCardPage}`}
        imageUrl={card.image_url}
        headline={card.copy_headline}
        message=""
        hideEmptyCenterMessageBody
        senderName={card.sender_name || "Someone special"}
        recipientName={card.recipient_name || "You"}
        contributions={contributions}
        editable
        onHeadlineChange={handleHeadlineChange}
        onRegenerateHeadline={handleRegenerateHeadline}
        onRegenerateImage={handleRegenerateImage}
        isRegeneratingHeadline={isRegeneratingHeadline}
        isRegeneratingImage={isRegeneratingImage}
        extraPages={card.extra_pages ?? 0}
        onAddPage={handleAddPage}
        initialPage={initialCardPage}
        contributeSubmitNonce={submitNonce}
        editableContributionIds={editableContributionIds}
        onContributionEdit={handleContributionEdit}
        onContributionLayoutChange={handleContributionLayoutChange}
        onContributionRegenerateMessage={handleContributionRegenerateMessage}
        contributionRegeneratingId={regeneratingContributionId}
        composePageBump={showCompose ? 1 : 0}
        composeDraft={showCompose ? composeDraft : null}
        onComposeDraftChange={
          showCompose
            ? (patch) => setComposeDraft((d) => (d ? { ...d, ...patch } : d))
            : undefined
        }
        onComposeCanvasPlace={
          showCompose
            ? (pt) => {
                setComposeDraft({
                  message: "",
                  x: pt.x,
                  y: pt.y,
                  pageIndex: pt.pageIndex,
                  textColor: randomPresetTextColor(),
                  rotationDegrees: 0,
                })
              }
            : undefined
        }
        onComposeSubmit={showCompose ? submitComposeDraft : undefined}
        onComposeCancel={showCompose ? cancelCompose : undefined}
        composeSubmitting={submitting}
        composeError={showCompose && composeDraft ? composeError : null}
        onComposeDraftRegenerateMessage={
          showCompose ? handleComposeDraftRegenerate : undefined
        }
        composeDraftRegenerating={composeDraftRegenerating}
      />
    </div>
  )
}
