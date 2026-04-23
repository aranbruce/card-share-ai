"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Card3D } from "@/components/card-3d"
import type { Contribution } from "@/lib/card-body"
import { Spinner } from "@/components/ui/spinner"
import { GiphyPicker } from "@/components/card-3d/giphy-picker"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"

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

export type ActiveContributionFormattingState = {
  id: string
  fontSize: number
  textColor: string | null
  rotationDegrees: number
  pageIndex: number
  hasGif: boolean
  giphyUrl?: string | null
  totalInnerPages: number
  isRegeneratingMessage: boolean
  onFontSizeChange: (px: number) => void
  onTextColorChange: (hex: string | null) => void
  onRotationChange: (deg: number) => void
  onPageChange: (page: number) => void
  onGifOpen: () => void
  onGifClear?: () => void
  onAiRefine: (prompt: string) => Promise<void>
}

export type CardOwnerStudioHandle = {
  regenerateImage: (prompt: string) => Promise<void>
  regenerateHeadline: (prompt: string) => Promise<void>
}

export type CardOwnerStudioProps = {
  cardId: string
  /** 0 = cover; 1 = first inside spread (e.g. after creating a card). */
  initialCardPage?: number
  /** Increment to trigger CardOwnerStudio to re-fetch card data from the server. */
  reloadNonce?: number
  /** Fired when the active contribution formatting state changes (null = no note selected). */
  onActiveContributionChange?: (
    state: ActiveContributionFormattingState | null,
  ) => void
  /** Called when image regeneration starts or finishes. */
  onRegeneratingImageChange?: (v: boolean) => void
  /** Called when headline regeneration starts or finishes. */
  onRegeneratingHeadlineChange?: (v: boolean) => void
  /** Called when the card's headline, image URL, or image prompt changes (after a successful regeneration). */
  onCardDataChange?: (
    updates: Partial<Pick<OwnerCard, "copy_headline" | "image_url" | "image_prompt">>,
  ) => void
}

export const CardOwnerStudio = forwardRef<
  CardOwnerStudioHandle,
  CardOwnerStudioProps
>(function CardOwnerStudio(
  {
    cardId,
    initialCardPage = 0,
    reloadNonce,
    onActiveContributionChange,
    onRegeneratingImageChange,
    onRegeneratingHeadlineChange,
    onCardDataChange,
  }: CardOwnerStudioProps,
  ref,
) {
  const [card, setCard] = useState<OwnerCard | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [regeneratingContributionId, setRegeneratingContributionId] = useState<
    string | null
  >(null)
  const [isRegeneratingHeadline, setIsRegeneratingHeadline] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [editingContributionId, setEditingContributionId] = useState<
    string | null
  >(null)
  const [contribGifPickerContributionId, setContribGifPickerContributionId] =
    useState<string | null>(null)
  const [navigateToPage, setNavigateToPage] = useState<number | undefined>(
    undefined,
  )
  const headlineSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const ownerMessageSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const ownerLayoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const ownerGifSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  useEffect(() => {
    return () => {
      if (headlineSaveTimerRef.current)
        clearTimeout(headlineSaveTimerRef.current)
      if (ownerMessageSaveTimerRef.current)
        clearTimeout(ownerMessageSaveTimerRef.current)
      if (ownerLayoutSaveTimerRef.current)
        clearTimeout(ownerLayoutSaveTimerRef.current)
      if (ownerGifSaveTimerRef.current)
        clearTimeout(ownerGifSaveTimerRef.current)
    }
  }, [])

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
        contributions?: Contribution[]
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

  const prevReloadNonceRef = useRef(reloadNonce ?? 0)
  useEffect(() => {
    const nonce = reloadNonce ?? 0
    if (nonce !== prevReloadNonceRef.current) {
      prevReloadNonceRef.current = nonce
      void load()
    }
  }, [reloadNonce, load])

  const creatorRow = useMemo(
    () => contributions.find((c) => Boolean(c.is_creator)),
    [contributions],
  )

  // Show compose draft mode when the creator note hasn't been placed yet (no position).
  const showCompose = Boolean(creatorRow && creatorRow.position_x === null)

  const [draftFormatting, setDraftFormatting] = useState<{
    textColor: string | null
    fontSize: number
    rotationDegrees: number
    pageIndex: number
    giphyUrl: string | null
  }>(() => ({
    textColor: randomPresetTextColor(),
    fontSize: 16,
    rotationDegrees: 0,
    pageIndex: 1,
    giphyUrl: null,
  }))
  const [draftGifPickerOpen, setDraftGifPickerOpen] = useState(false)

  const editableContributionIds = useMemo(
    () => (creatorRow && !showCompose ? [creatorRow.id] : []),
    [creatorRow, showCompose],
  )

  // Keep the creator contribution always selected so the side panel is always active.
  useEffect(() => {
    if (creatorRow && !showCompose && !editingContributionId) {
      setEditingContributionId(creatorRow.id)
    }
  }, [creatorRow, showCompose, editingContributionId])

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
    ) => {
      const res = await fetch(`/api/cards/${cardId}/contributions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, ...updates }),
      })
      const p = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error(
          "Owner contribution save failed",
          typeof p.error === "string" ? p.error : p,
        )
        return
      }
      if (Array.isArray(p.contributions)) {
        setContributions(p.contributions as Contribution[])
      }
      if (typeof p.extra_pages === "number") {
        setCard((prev) =>
          prev ? { ...prev, extra_pages: p.extra_pages } : prev,
        )
      }
    },
    [cardId],
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
        void saveContributionPatch(contributionId, { message: value })
      }, 600)
    },
    [creatorRow, saveContributionPatch],
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
        void saveContributionPatch(contributionId, {
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
    [creatorRow, saveContributionPatch],
  )

  const changeActiveContributionLayout = useCallback(
    (partial: {
      fontSize?: number
      textColor?: string | null
      rotationDegrees?: number | null
      pageIndex?: number
    }) => {
      const id = editingContributionId
      if (!id) return
      const contrib = contributions.find((c) => c.id === id)
      if (!contrib) return
      const x = typeof contrib.position_x === "number" ? contrib.position_x : 24
      const y = typeof contrib.position_y === "number" ? contrib.position_y : 24
      const widthPercent =
        typeof contrib.width_percent === "number" ? contrib.width_percent : 75
      const pageIndex =
        partial.pageIndex ??
        (typeof contrib.page_index === "number" ? contrib.page_index : 1)
      handleContributionLayoutChange(id, {
        x,
        y,
        widthPercent,
        pageIndex,
        ...(partial.fontSize !== undefined && { fontSize: partial.fontSize }),
        ...(partial.textColor !== undefined && {
          textColor: partial.textColor,
        }),
        ...(partial.rotationDegrees !== undefined && {
          rotationDegrees: partial.rotationDegrees,
        }),
      })
    },
    [editingContributionId, contributions, handleContributionLayoutChange],
  )

  const totalInnerPages = useMemo(
    () => 1 + (card?.extra_pages ?? 0),
    [card?.extra_pages],
  )

  const handleContributionGifChange = useCallback(
    (contributionId: string, giphyUrl: string | null) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, giphy_url: giphyUrl } : c,
        ),
      )
      if (!creatorRow || contributionId !== creatorRow.id) return
      if (ownerGifSaveTimerRef.current)
        clearTimeout(ownerGifSaveTimerRef.current)
      const currentMessage = creatorRow.message
      ownerGifSaveTimerRef.current = setTimeout(() => {
        void saveContributionPatch(contributionId, {
          giphyUrl,
          ...(currentMessage && { message: currentMessage }),
        })
      }, 200)
    },
    [creatorRow, saveContributionPatch],
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
        await saveContributionPatch(contributionId, { message: next })
      } catch (e) {
        console.error(e)
      } finally {
        setRegeneratingContributionId(null)
      }
    },
    [card, creatorRow, contributions, saveContributionPatch],
  )

  const activeContributionFormattingState =
    useMemo((): ActiveContributionFormattingState | null => {
      if (!editingContributionId) return null
      const contrib = contributions.find((c) => c.id === editingContributionId)
      if (!contrib) return null
      if (!editableContributionIds.includes(editingContributionId)) return null
      return {
        id: editingContributionId,
        fontSize: contrib.font_size ?? 16,
        textColor: contrib.text_color ?? null,
        rotationDegrees: contrib.rotation_degrees ?? 0,
        pageIndex:
          typeof contrib.page_index === "number" ? contrib.page_index : 1,
        hasGif: Boolean(contrib.giphy_url),
        giphyUrl: contrib.giphy_url,
        totalInnerPages,
        isRegeneratingMessage:
          regeneratingContributionId === editingContributionId,
        onFontSizeChange: (px) =>
          changeActiveContributionLayout({ fontSize: px }),
        onTextColorChange: (hex) =>
          changeActiveContributionLayout({ textColor: hex }),
        onRotationChange: (deg) =>
          changeActiveContributionLayout({ rotationDegrees: deg }),
        onPageChange: (page) => {
          setNavigateToPage(page)
          changeActiveContributionLayout({ pageIndex: page })
        },
        onGifOpen: () =>
          setContribGifPickerContributionId(editingContributionId),
        onGifClear:
          contrib.giphy_url &&
          typeof contrib.message === "string" &&
          contrib.message.trim().length > 0
            ? () => handleContributionGifChange(editingContributionId, null)
            : undefined,
        onAiRefine: (prompt) =>
          handleContributionRegenerateMessage(editingContributionId, prompt),
      }
    }, [
      editingContributionId,
      contributions,
      editableContributionIds,
      totalInnerPages,
      regeneratingContributionId,
      changeActiveContributionLayout,
      handleContributionGifChange,
      handleContributionRegenerateMessage,
    ])

  const composeDraftFormattingState =
    useMemo((): ActiveContributionFormattingState | null => {
      if (!showCompose || !creatorRow) return null
      return {
        id: creatorRow.id,
        fontSize: draftFormatting.fontSize,
        textColor: draftFormatting.textColor,
        rotationDegrees: draftFormatting.rotationDegrees,
        pageIndex: draftFormatting.pageIndex,
        hasGif: Boolean(draftFormatting.giphyUrl),
        giphyUrl: draftFormatting.giphyUrl,
        totalInnerPages,
        isRegeneratingMessage: false,
        onFontSizeChange: (px) =>
          setDraftFormatting((p) => ({ ...p, fontSize: px })),
        onTextColorChange: (hex) =>
          setDraftFormatting((p) => ({ ...p, textColor: hex })),
        onRotationChange: (deg) =>
          setDraftFormatting((p) => ({ ...p, rotationDegrees: deg })),
        onPageChange: (page) => {
          setDraftFormatting((p) => ({ ...p, pageIndex: page }))
          setNavigateToPage(page)
        },
        onGifOpen: () => setDraftGifPickerOpen(true),
        onGifClear: draftFormatting.giphyUrl
          ? () => setDraftFormatting((p) => ({ ...p, giphyUrl: null }))
          : undefined,
        onAiRefine: async () => {},
      }
    }, [showCompose, creatorRow, draftFormatting, totalInnerPages])

  const handleComposeCanvasPlace = useCallback(
    (pos: { x: number; y: number; pageIndex: number }) => {
      if (!creatorRow) return
      const widthPercent = 75
      setContributions((prev) =>
        prev.map((c) =>
          c.id === creatorRow.id
            ? {
                ...c,
                position_x: pos.x,
                position_y: pos.y,
                width_percent: widthPercent,
                page_index: pos.pageIndex,
                font_size: draftFormatting.fontSize,
                text_color: draftFormatting.textColor,
                rotation_degrees: draftFormatting.rotationDegrees,
                giphy_url: draftFormatting.giphyUrl,
              }
            : c,
        ),
      )
      setNavigateToPage(pos.pageIndex)
      setEditingContributionId(creatorRow.id)
      void saveContributionPatch(creatorRow.id, {
        positionX: pos.x,
        positionY: pos.y,
        widthPercent,
        pageIndex: pos.pageIndex,
        fontSize: draftFormatting.fontSize,
        textColor: draftFormatting.textColor,
        rotationDegrees: draftFormatting.rotationDegrees,
        giphyUrl: draftFormatting.giphyUrl ?? null,
      })
    },
    [creatorRow, draftFormatting, saveContributionPatch],
  )

  useEffect(() => {
    onActiveContributionChange?.(
      composeDraftFormattingState ?? activeContributionFormattingState,
    )
  }, [
    composeDraftFormattingState,
    activeContributionFormattingState,
    onActiveContributionChange,
  ])

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
        onCardDataChange?.({ copy_headline: next })
      } catch (e) {
        console.error(e)
      } finally {
        setIsRegeneratingHeadline(false)
      }
    },
    [card, patchCardFields, onCardDataChange],
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
          onCardDataChange?.({ image_url: imageUrl, image_prompt: newPrompt })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsRegeneratingImage(false)
      }
    },
    [card, patchCardFields, onCardDataChange],
  )

  useImperativeHandle(
    ref,
    () => ({
      regenerateImage: (prompt) => handleRegenerateImage(prompt),
      regenerateHeadline: handleRegenerateHeadline,
    }),
    [handleRegenerateImage, handleRegenerateHeadline],
  )

  useEffect(() => {
    onRegeneratingImageChange?.(isRegeneratingImage)
  }, [isRegeneratingImage, onRegeneratingImageChange])

  useEffect(() => {
    onRegeneratingHeadlineChange?.(isRegeneratingHeadline)
  }, [isRegeneratingHeadline, onRegeneratingHeadlineChange])

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

  // Backward compat: pre-create an empty creator contribution for cards that were
  // created before this flow existed (new cards already have one from the API).
  const creatingCreatorContribRef = useRef(false)
  useEffect(() => {
    if (loading || creatorRow || !card || creatingCreatorContribRef.current)
      return
    creatingCreatorContribRef.current = true
    void fetch(`/api/cards/${cardId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "",
        positionX: 24,
        positionY: 24,
        widthPercent: 75,
        pageIndex: 1,
        fontSize: 16,
      }),
    })
      .then((r) => r.json())
      .then(
        (res: {
          error?: string
          contribution?: Contribution
          contributions?: Contribution[]
        }) => {
          if (res.error) console.error("[lazy creation]", res.error)
          if (Array.isArray(res.contributions)) {
            setContributions(res.contributions)
          } else if (res.contribution) {
            setContributions((prev) => [...prev, res.contribution!])
          } else {
            creatingCreatorContribRef.current = false
          }
        },
      )
      .catch((err: unknown) => {
        console.error("[lazy creation] fetch error", err)
        creatingCreatorContribRef.current = false
      })
  }, [loading, creatorRow, card, cardId])

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
        isRegeneratingHeadline={isRegeneratingHeadline}
        isRegeneratingImage={isRegeneratingImage}
        suppressComposeActions
        onComposeCanvasPlace={
          showCompose ? handleComposeCanvasPlace : undefined
        }
        onEditingContributionChange={(id) => {
          if (id !== null) setEditingContributionId(id)
        }}
        navigateToPage={navigateToPage}
        extraPages={card.extra_pages ?? 0}
        onAddPage={handleAddPage}
        initialPage={initialCardPage}
        editableContributionIds={editableContributionIds}
        onContributionEdit={handleContributionEdit}
        onContributionGifChange={handleContributionGifChange}
        onContributionLayoutChange={handleContributionLayoutChange}
        contributionRegeneratingId={regeneratingContributionId}
      />
      <GiphyPicker
        open={Boolean(contribGifPickerContributionId)}
        onOpenChange={(open) => {
          if (!open) setContribGifPickerContributionId(null)
        }}
        selectedUrl={
          contributions.find((c) => c.id === contribGifPickerContributionId)
            ?.giphy_url ?? null
        }
        onSelect={(url) => {
          if (!contribGifPickerContributionId) return
          handleContributionGifChange(contribGifPickerContributionId, url)
        }}
      />
      <GiphyPicker
        open={draftGifPickerOpen}
        onOpenChange={(open) => setDraftGifPickerOpen(open)}
        selectedUrl={draftFormatting.giphyUrl}
        onSelect={(url) => {
          setDraftFormatting((p) => ({ ...p, giphyUrl: url }))
          setDraftGifPickerOpen(false)
        }}
      />
    </div>
  )
})
