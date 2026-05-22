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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card3D } from "@/components/card-3d"
import type { Contribution } from "@/lib/card-body"
import { Skeleton } from "@/components/ui/skeleton"
import { GiphyPicker } from "@/components/card-3d/giphy-picker"
import { randomPresetTextColor } from "@/lib/message-text-color-presets"
import {
  storedFontFamilyFromPresetId,
  type MessageFontPresetId,
} from "@/lib/message-font-presets"
import { useCardData } from "@/hooks/use-card-data"
import { useContributions } from "@/hooks/use-contributions"
import { useDebouncedSave } from "@/hooks/use-debounced-save"
import { apiPatch, apiPost } from "@/lib/api-client"
import { hasUnusedStoredExtraPages } from "@/lib/card-extra-pages"
import { computeNaturalPageSpread } from "@/components/card-3d/card-page-spread"
import {
  contributionHasCanvasPosition,
  contributionPageIndex,
} from "@/lib/contribution-layout"
import { sourceImageUrlForRefineRequest } from "@/lib/source-image-limits"

export type OwnerCard = {
  id: string
  card_type?: string
  recipient_name: string
  recipient_email?: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  extra_pages?: number
  contributor_link_id?: string
}

export type ActiveContributionFormattingState = {
  id: string
  fontSize: number
  textColor: string | null
  fontFamily: string | null
  rotationDegrees: number
  pageIndex: number
  hasGif: boolean
  giphyUrl?: string | null
  totalInnerPages: number
  isRegeneratingMessage: boolean
  onFontSizeChange: (px: number) => void
  onFontFamilyChange: (id: MessageFontPresetId) => void
  onTextColorChange: (hex: string | null) => void
  onRotationChange: (deg: number) => void
  onPageChange: (page: number) => void
  onGifOpen: () => void
  onGifClear?: () => void
  onAiRefine: (prompt: string) => Promise<void>
}

export type CardOwnerStudioHandle = {
  regenerateImage: (prompt: string, attachedImageUrl?: string) => Promise<void>
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
  /** Called when the card's headline or image URL changes (after a successful regeneration). */
  onCardDataChange?: (
    updates: Partial<Pick<OwnerCard, "copy_headline" | "image_url">>,
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
  const {
    card,
    setCard,
    contributions,
    setContributions,
    contributionsLoaded,
    loading,
    error,
  } = useCardData(cardId, reloadNonce)

  const [isRegeneratingHeadline, setIsRegeneratingHeadline] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [regeneratingContributionId, setRegeneratingContributionId] = useState<
    string | null
  >(null)
  const [editingContributionId, setEditingContributionId] = useState<
    string | null
  >(null)
  const [contribGifPickerContributionId, setContribGifPickerContributionId] =
    useState<string | null>(null)
  const [navigateToPage, setNavigateToPage] = useState<number | undefined>(
    undefined,
  )

  const scheduleHeadlineSave = useDebouncedSave(600)

  const {
    creatorRow,
    saveContributionPatch,
    handleContributionEdit,
    handleContributionLayoutChange,
    changeActiveContributionLayout,
    handleContributionGifChange,
    handleContributionRegenerateMessage: _handleContributionRegenerateMessage,
  } = useContributions({
    cardId,
    card,
    contributions,
    editingContributionId,
    setContributions,
    setCard,
  })

  const handleContributionRegenerateMessage = useCallback(
    async (contributionId: string, prompt: string) => {
      setRegeneratingContributionId(contributionId)
      try {
        await _handleContributionRegenerateMessage(contributionId, prompt)
      } finally {
        setRegeneratingContributionId(null)
      }
    },
    [_handleContributionRegenerateMessage],
  )

  // Show compose draft mode when the creator note hasn't been placed yet (no position).
  const showCompose = Boolean(
    creatorRow && !contributionHasCanvasPosition(creatorRow),
  )

  const [draftFormatting, setDraftFormatting] = useState<{
    textColor: string | null
    fontSize: number
    fontFamily: string | null
    rotationDegrees: number
    pageIndex: number
    giphyUrl: string | null
  }>(() => ({
    textColor: randomPresetTextColor(),
    fontSize: 16,
    fontFamily: null,
    rotationDegrees: 0,
    pageIndex: 1,
    giphyUrl: null,
  }))
  const [draftGifPickerOpen, setDraftGifPickerOpen] = useState(false)
  const [autoFocusContributionId, setAutoFocusContributionId] = useState<
    string | null
  >(null)

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

  const totalInnerPages = useMemo(() => {
    const spread = computeNaturalPageSpread(
      false,
      1,
      contributions,
      card?.extra_pages ?? 0,
    )
    return Math.max(1, spread.totalPages - 1)
  }, [contributions, card?.extra_pages])

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
        fontFamily: contrib.font_family ?? null,
        rotationDegrees: contrib.rotation_degrees ?? 0,
        pageIndex: contributionPageIndex(contrib, 1),
        hasGif: Boolean(contrib.giphy_url),
        giphyUrl: contrib.giphy_url,
        totalInnerPages,
        isRegeneratingMessage:
          regeneratingContributionId === editingContributionId,
        onFontSizeChange: (px) =>
          changeActiveContributionLayout({ fontSize: px }),
        onFontFamilyChange: (id) =>
          changeActiveContributionLayout({
            fontFamily: storedFontFamilyFromPresetId(id),
          }),
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
        fontFamily: draftFormatting.fontFamily,
        rotationDegrees: draftFormatting.rotationDegrees,
        pageIndex: draftFormatting.pageIndex,
        hasGif: Boolean(draftFormatting.giphyUrl),
        giphyUrl: draftFormatting.giphyUrl,
        totalInnerPages,
        isRegeneratingMessage: false,
        onFontSizeChange: (px) =>
          setDraftFormatting((p) => ({ ...p, fontSize: px })),
        onFontFamilyChange: (id) =>
          setDraftFormatting((p) => ({
            ...p,
            fontFamily: storedFontFamilyFromPresetId(id),
          })),
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
                font_family: draftFormatting.fontFamily,
                rotation_degrees: draftFormatting.rotationDegrees,
                giphy_url: draftFormatting.giphyUrl,
              }
            : c,
        ),
      )
      setNavigateToPage(pos.pageIndex)
      setEditingContributionId(creatorRow.id)
      setAutoFocusContributionId(creatorRow.id)
      void saveContributionPatch(creatorRow.id, {
        positionX: pos.x,
        positionY: pos.y,
        widthPercent,
        pageIndex: pos.pageIndex,
        fontSize: draftFormatting.fontSize,
        textColor: draftFormatting.textColor,
        fontFamily: draftFormatting.fontFamily,
        rotationDegrees: draftFormatting.rotationDegrees,
        giphyUrl: draftFormatting.giphyUrl ?? null,
      })
    },
    [creatorRow, draftFormatting, saveContributionPatch, setContributions],
  )

  useEffect(() => {
    if (!autoFocusContributionId) return
    let outerId = 0
    let innerId = 0
    outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        setAutoFocusContributionId(null)
      })
    })
    return () => {
      cancelAnimationFrame(outerId)
      cancelAnimationFrame(innerId)
    }
  }, [autoFocusContributionId])

  useEffect(() => {
    onActiveContributionChange?.(
      composeDraftFormattingState ?? activeContributionFormattingState,
    )
  }, [
    composeDraftFormattingState,
    activeContributionFormattingState,
    onActiveContributionChange,
  ])

  const patchCardFields = useCallback(
    async (updates: Record<string, unknown>) => {
      const { card: next } = await apiPatch<{ card: Record<string, unknown> }>(
        `/api/cards/${cardId}`,
        updates,
      )
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
        if (
          typeof updates.extra_pages === "number" &&
          Number.isFinite(updates.extra_pages)
        ) {
          cardExtraPagesRef.current = Math.trunc(updates.extra_pages)
        }
        return merged
      })
    },
    [cardId, setCard],
  )

  const handleHeadlineChange = useCallback(
    (value: string) => {
      setCard((c) => (c ? { ...c, copy_headline: value } : c))
      scheduleHeadlineSave(() => {
        void patchCardFields({ copy_headline: value }).catch(console.error)
      })
    },
    [setCard, scheduleHeadlineSave, patchCardFields],
  )

  const handleRegenerateHeadline = useCallback(
    async (prompt: string) => {
      if (!card) return
      setIsRegeneratingHeadline(true)
      try {
        const { text } = await apiPost<{ text?: string }>(
          "/api/regenerate-text",
          {
            field: "headline",
            cardType: card.card_type || "custom",
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            currentValue: card.copy_headline,
            userPrompt: prompt,
            existingCardCoverImageUrl:
              sourceImageUrlForRefineRequest(card.image_url) ?? "",
          },
        )
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
    [card, patchCardFields, setCard, onCardDataChange],
  )

  const handleRegenerateImage = useCallback(
    async (prompt: string, attachedImageUrl?: string) => {
      if (!card) return
      setIsRegeneratingImage(true)
      try {
        const existingCover = sourceImageUrlForRefineRequest(card.image_url)
        const { imageUrl } = await apiPost<{ imageUrl?: string }>(
          "/api/generate-image",
          {
            cardType: card.card_type,
            coverHeadline: card.copy_headline,
            ...(prompt ? { imagePrompt: prompt } : {}),
            ...(existingCover &&
            (!attachedImageUrl || !existingCover.startsWith("data:"))
              ? { existingCardCoverImageUrl: existingCover }
              : {}),
            ...(attachedImageUrl ? { attachedImageUrl } : {}),
          },
        )
        if (imageUrl) {
          setCard((c) => (c ? { ...c, image_url: imageUrl } : c))
          await patchCardFields({ image_url: imageUrl })
          onCardDataChange?.({ image_url: imageUrl })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsRegeneratingImage(false)
      }
    },
    [card, patchCardFields, setCard, onCardDataChange],
  )

  useImperativeHandle(
    ref,
    () => ({
      regenerateImage: (prompt, attachedImageUrl) =>
        handleRegenerateImage(prompt, attachedImageUrl),
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

  const cardExtraPagesRef = useRef(0)
  useEffect(() => {
    cardExtraPagesRef.current = card?.extra_pages ?? 0
  }, [card?.extra_pages])

  const trimExtraPagesRef = useRef<"idle" | "inFlight" | "done">("idle")
  const trimExtraPagesPromiseRef = useRef<Promise<void> | null>(null)
  useEffect(() => {
    trimExtraPagesRef.current = "idle"
    trimExtraPagesPromiseRef.current = null
  }, [cardId, reloadNonce])

  // Trim stale extra_pages once per load — not on every card/contributions update,
  // so a user-initiated "Add Page" is not immediately undone.
  useEffect(() => {
    if (loading || !card || trimExtraPagesRef.current !== "idle") return
    if (!contributionsLoaded) {
      trimExtraPagesRef.current = "done"
      return
    }
    const stored = card.extra_pages ?? 0
    if (!hasUnusedStoredExtraPages(stored, contributions)) {
      trimExtraPagesRef.current = "done"
      return
    }
    trimExtraPagesRef.current = "inFlight"
    const trimPromise = patchCardFields({ extra_pages: 0 })
      .then(() => {
        trimExtraPagesRef.current = "done"
      })
      .catch((e) => {
        console.error(e)
        trimExtraPagesRef.current = "idle"
      })
      .finally(() => {
        if (trimExtraPagesPromiseRef.current === trimPromise) {
          trimExtraPagesPromiseRef.current = null
        }
      })
    trimExtraPagesPromiseRef.current = trimPromise
    // card + contributions read when loading flips false; omit from deps intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trim once per cardId/reloadNonce
  }, [loading, cardId, reloadNonce, patchCardFields])

  const addExtraPageInFlightRef = useRef(false)
  const handleAddPage = useCallback(async () => {
    if (addExtraPageInFlightRef.current) return
    addExtraPageInFlightRef.current = true
    try {
      const trimWasPending = trimExtraPagesPromiseRef.current !== null
      if (trimWasPending) {
        await trimExtraPagesPromiseRef.current!.catch(() => {})
      }
      const base =
        trimWasPending && trimExtraPagesRef.current === "done"
          ? 0
          : cardExtraPagesRef.current
      await patchCardFields({ extra_pages: base + 1 })
    } catch (e) {
      console.error(e)
    } finally {
      addExtraPageInFlightRef.current = false
    }
  }, [patchCardFields])

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
  }, [loading, creatorRow, card, cardId, setContributions])

  if (loading || !card) {
    if (loading) {
      return <Skeleton className="card-cover-skeleton" />
    }
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Card not found</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="w-full space-y-6">
      <Card3D
        key={`${cardId}-${initialCardPage}`}
        imageUrl={card.image_url}
        headline={card.copy_headline}
        message=""
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
        autoFocusContributionId={autoFocusContributionId}
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
