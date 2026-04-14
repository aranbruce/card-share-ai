"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Card3DProps } from "./types"
import {
  RegenerateShimmerOverlay,
  InlineEdit,
  ToolbarRegenerateButton,
  type InlineEditRegenerateHandle,
} from "./inline-edit"
import {
  MessageFormattingToolbar,
  snapMessageFontSize,
  snapMessageRotationDegrees,
} from "./message-formatting-toolbar"
import { RegeneratePromptBar } from "./regenerate-prompt-bar"
import {
  DraggableWrapper,
  CANVAS_EDGE_PADDING,
  COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX,
} from "./draggable-wrapper"
import {
  ComposeDraftEditor,
  ComposeCanvasEmptyHint,
} from "./compose-draft-editor"
import {
  computeNaturalPageSpread,
  capSpreadToCommitted,
  type CommittedSpreadSnapshot,
} from "./card-page-spread"
import {
  looksLikeDataUrl,
  sourceImageUrlForRefineRequest,
} from "@/lib/source-image-limits"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Sparkles, X, ArrowUp } from "lucide-react"
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  startTransition,
  useCallback,
  type MouseEvent,
} from "react"

const MESSAGES_SECTION_LABEL = "Messages"

export function Card3D({
  imageUrl,
  headline,
  message,
  senderName,
  recipientName,
  isGeneratingImage,
  contributions = [],
  editable = false,
  onHeadlineChange,
  onMessageChange,
  onAddPage,
  extraPages = 0,
  onRegenerateHeadline,
  onRegenerateMessage,
  onRegenerateImage,
  isRegeneratingHeadline = false,
  isRegeneratingMessage = false,
  isRegeneratingImage = false,
  messageFontSize = 18,
  onMessageFontSizeChange,
  messageTextColor,
  onMessageTextColorChange,
  messagePageIndex = 1,
  onMessagePageIndexChange,
  initialPage = 0,
  contributeOverlay,
  contributeSubmitNonce = 0,
  editableContributionIds = [],
  onContributionEdit,
  onContributionLayoutChange,
  onContributionRegenerateMessage,
  contributionRegeneratingId = null,
  composePageBump = 0,
  composeDraft = null,
  onComposeDraftChange,
  onComposeCanvasPlace,
  onComposeSubmit,
  onComposeCancel,
  composeSubmitting = false,
  composeError = null,
  onComposeDraftRegenerateMessage,
  composeDraftRegenerating = false,
  coverOnly = false,
  hideEmptyCenterMessageBody = false,
}: Card3DProps) {
  void senderName
  const [currentPage, setCurrentPage] = useState(coverOnly ? 0 : initialPage)
  const [showImagePrompt, setShowImagePrompt] = useState(false)
  const [imagePromptText, setImagePromptText] = useState("")
  const imagePromptRef = useRef<HTMLInputElement>(null)
  const [editingContributionId, setEditingContributionId] = useState<
    string | null
  >(null)
  /** Inline “Describe the change” prompt replaces the footer toolbar for this scope while open. */
  const [regeneratePromptScopeKey, setRegeneratePromptScopeKey] = useState<
    string | null
  >(null)
  const [regeneratePromptDraft, setRegeneratePromptDraft] = useState("")
  const lastContributeSubmitNavNonce = useRef(0)
  const mainMessageInlineRef = useRef<InlineEditRegenerateHandle | null>(null)
  const contributionInlineRegenRefs = useRef(
    new Map<string, InlineEditRegenerateHandle>(),
  )
  const addPagePendingRef = useRef(false)
  const addPageSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const prevTotalPagesForAddRef = useRef<number | null>(null)

  const startAddPageWait = useCallback(() => {
    addPagePendingRef.current = true
    if (addPageSafetyTimerRef.current) {
      clearTimeout(addPageSafetyTimerRef.current)
    }
    addPageSafetyTimerRef.current = setTimeout(() => {
      addPagePendingRef.current = false
      addPageSafetyTimerRef.current = null
    }, 5000)
  }, [])

  const cancelAddPageWait = useCallback(() => {
    addPagePendingRef.current = false
    if (addPageSafetyTimerRef.current) {
      clearTimeout(addPageSafetyTimerRef.current)
      addPageSafetyTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (showImagePrompt && imagePromptRef.current) {
      imagePromptRef.current.focus()
    }
  }, [showImagePrompt])

  const [committedSpread, setCommittedSpread] =
    useState<CommittedSpreadSnapshot | null>(null)

  const naturalPageSpread = useMemo(
    () =>
      computeNaturalPageSpread(
        coverOnly,
        messagePageIndex,
        contributions,
        extraPages,
        composePageBump,
      ),
    [coverOnly, messagePageIndex, contributions, extraPages, composePageBump],
  )

  const { totalPages, validMessagePage } = useMemo(
    () =>
      capSpreadToCommitted(
        naturalPageSpread,
        committedSpread,
        messagePageIndex,
        extraPages,
        composePageBump,
        coverOnly,
      ),
    [
      naturalPageSpread,
      committedSpread,
      messagePageIndex,
      extraPages,
      composePageBump,
      coverOnly,
    ],
  )

  useLayoutEffect(() => {
    startTransition(() => {
      if (coverOnly) {
        setCommittedSpread(null)
        return
      }
      setCommittedSpread((prev) => {
        const next: CommittedSpreadSnapshot = {
          totalPages,
          extraPages,
          composePageBump,
        }
        if (
          prev &&
          prev.totalPages === next.totalPages &&
          prev.extraPages === next.extraPages &&
          prev.composePageBump === next.composePageBump
        ) {
          return prev
        }
        return next
      })
    })
  }, [coverOnly, totalPages, extraPages, composePageBump])

  const effectiveContributionPage = (
    contrib: (typeof contributions)[number],
  ) =>
    typeof contrib.page_index === "number" && contrib.page_index >= 0
      ? contrib.page_index
      : validMessagePage + 1

  const isMessagePage = !coverOnly && currentPage === validMessagePage

  const showMainSpreadInnerBody =
    !hideEmptyCenterMessageBody ||
    message.trim().length > 0 ||
    typeof onMessageChange === "function"

  useEffect(() => {
    if (coverOnly) return
    if (contributeSubmitNonce <= 0) return
    if (contributeSubmitNonce <= lastContributeSubmitNavNonce.current) return
    lastContributeSubmitNavNonce.current = contributeSubmitNonce

    const last = contributions[contributions.length - 1]
    if (!last) return

    const pageIdx =
      typeof last.page_index === "number" && last.page_index >= 0
        ? last.page_index
        : validMessagePage + 1
    const maxPage = Math.max(0, totalPages - 1)
    queueMicrotask(() => {
      setCurrentPage(Math.min(Math.max(0, pageIdx), maxPage))
    })
  }, [
    coverOnly,
    contributeSubmitNonce,
    contributions,
    validMessagePage,
    totalPages,
  ])

  useEffect(() => {
    if (!coverOnly) return
    queueMicrotask(() => {
      setCurrentPage(0)
    })
  }, [coverOnly])

  useEffect(() => {
    if (totalPages <= 0) return
    if (addPagePendingRef.current) return
    if (currentPage >= totalPages) {
      queueMicrotask(() => {
        setCurrentPage(Math.max(0, totalPages - 1))
      })
    }
  }, [totalPages, currentPage])

  useEffect(() => {
    if (
      prevTotalPagesForAddRef.current !== null &&
      totalPages > prevTotalPagesForAddRef.current
    ) {
      cancelAddPageWait()
    }
    prevTotalPagesForAddRef.current = totalPages
  }, [totalPages, cancelAddPageWait])

  const goToPage = (page: number) => {
    if (page < 0) return
    if (page < totalPages) {
      setCurrentPage(page)
    }
  }

  async function handleAddPage() {
    if (!onAddPage) return
    const targetPage = totalPages
    startAddPageWait()
    try {
      await Promise.resolve(onAddPage())
    } catch {
      cancelAddPageWait()
      return
    }
    queueMicrotask(() => {
      setCurrentPage(targetPage)
    })
  }

  const isLastPage = currentPage === totalPages - 1
  const canGoRight =
    !coverOnly &&
    (currentPage < totalPages - 1 || (editable && onAddPage !== undefined))

  const reportComposePlace = useCallback(
    (e: MouseEvent) => {
      if (!onComposeCanvasPlace) return
      const overlay = e.currentTarget as HTMLElement
      const rect = overlay.getBoundingClientRect()
      const pad = CANVAS_EDGE_PADDING
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      const widthPx = rect.width * 0.75
      const halfW = widthPx / 2
      const halfH = COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX / 2
      const maxX = Math.max(pad, rect.width - widthPx - pad)
      const maxY = Math.max(
        pad,
        rect.height - COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX - pad,
      )
      const x = Math.max(pad, Math.min(maxX, clickX - halfW))
      const y = Math.max(pad, Math.min(maxY, clickY - halfH))
      onComposeCanvasPlace({
        x,
        y,
        pageIndex: currentPage,
      })
    },
    [currentPage, onComposeCanvasPlace],
  )

  const handleComposeDraftPatch = useCallback(
    (
      patch: Parameters<NonNullable<Card3DProps["onComposeDraftChange"]>>[0],
    ) => {
      onComposeDraftChange?.(patch)
      if (typeof patch.pageIndex === "number") {
        setCurrentPage(patch.pageIndex)
      }
    },
    [onComposeDraftChange, setCurrentPage],
  )

  const handleComposeInnerPageSelect = useCallback(
    (pageIndex: number) => {
      handleComposeDraftPatch({ pageIndex })
    },
    [handleComposeDraftPatch],
  )

  const editingContributionOnCanvas = useMemo(() => {
    if (!editingContributionId) return null
    const c = contributions.find((x) => x.id === editingContributionId)
    if (!c) return null
    const page =
      typeof c.page_index === "number" && c.page_index >= 0
        ? c.page_index
        : validMessagePage + 1
    if (page !== currentPage) return null
    return c
  }, [contributions, editingContributionId, currentPage, validMessagePage])

  const getContributionsForPage = (pageIdx: number) =>
    contributions.filter(
      (contrib) => effectiveContributionPage(contrib) === pageIdx,
    )

  const withContributionDefaults = (contrib: (typeof contributions)[number]) => ({
    x: typeof contrib.position_x === "number" ? contrib.position_x : 24,
    y: typeof contrib.position_y === "number" ? contrib.position_y : 24,
    widthPercent:
      typeof contrib.width_percent === "number" ? contrib.width_percent : 75,
    pageIndex:
      typeof contrib.page_index === "number" ? contrib.page_index : validMessagePage,
    fontSize: contrib.font_size ?? messageFontSize,
    textColor: contrib.text_color ?? null,
    rotationDegrees: contrib.rotation_degrees ?? null,
  })

  const renderContributionsForPage = (pageIdx: number) => {
    return getContributionsForPage(pageIdx).map((contrib) => {
      const canCanvasEdit =
        Boolean(onContributionEdit) &&
        editableContributionIds.includes(contrib.id)

      if (canCanvasEdit) {
        return (
          <DraggableWrapper
            key={contrib.id}
            editable
            isActive={editingContributionId === contrib.id}
            initialOffset={
              typeof contrib.position_x === "number" &&
              typeof contrib.position_y === "number"
                ? { x: contrib.position_x, y: contrib.position_y }
                : undefined
            }
            initialWidthPercent={
              typeof contrib.width_percent === "number"
                ? contrib.width_percent
                : undefined
            }
            rotationDegrees={contrib.rotation_degrees ?? 0}
            onLayoutCommit={
              onContributionLayoutChange
                ? (layout) =>
                    onContributionLayoutChange(contrib.id, {
                      ...layout,
                      pageIndex: pageIdx,
                    })
                : undefined
            }
            footer={
              onContributionLayoutChange &&
              editingContributionId === contrib.id ? (
                regeneratePromptScopeKey === contrib.id &&
                onContributionRegenerateMessage ? (
                  <div
                    data-contribution-format-toolbar={contrib.id}
                    data-regenerate-area
                  >
                    <RegeneratePromptBar
                      className="w-full max-w-none"
                      value={regeneratePromptDraft}
                      onValueChange={setRegeneratePromptDraft}
                      isRegenerating={contributionRegeneratingId === contrib.id}
                      onSubmit={() =>
                        void contributionInlineRegenRefs.current
                          .get(contrib.id)
                          ?.submitRegenerateWithPrompt(regeneratePromptDraft)
                      }
                      onCancel={() =>
                        contributionInlineRegenRefs.current
                          .get(contrib.id)
                          ?.closeRegeneratePrompt()
                      }
                    />
                  </div>
                ) : (
                  <div data-contribution-format-toolbar={contrib.id}>
                    <MessageFormattingToolbar
                      className="flex w-full max-w-none justify-between"
                      fontSize={contrib.font_size ?? messageFontSize}
                      onFontSizeChange={(newSize) =>
                        onContributionLayoutChange(contrib.id, {
                          ...withContributionDefaults(contrib),
                          pageIndex: pageIdx,
                          fontSize: newSize,
                        })
                      }
                      textColor={contrib.text_color ?? null}
                      onTextColorChange={(hex) =>
                        onContributionLayoutChange(contrib.id, {
                          ...withContributionDefaults(contrib),
                          pageIndex: pageIdx,
                          textColor: hex,
                        })
                      }
                      rotationDegrees={contrib.rotation_degrees ?? null}
                      onRotationDegreesChange={(deg) =>
                        onContributionLayoutChange(contrib.id, {
                          ...withContributionDefaults(contrib),
                          pageIndex: pageIdx,
                          rotationDegrees: deg,
                        })
                      }
                      showPage={totalPages > 1}
                      pageValue={
                        typeof contrib.page_index === "number"
                          ? contrib.page_index
                          : pageIdx
                      }
                      onPageChange={(newPage) => {
                        setCurrentPage(newPage)
                        onContributionLayoutChange(contrib.id, {
                          ...withContributionDefaults(contrib),
                          pageIndex: newPage,
                        })
                      }}
                      totalPages={totalPages}
                      aiTweakSlot={
                        onContributionRegenerateMessage ? (
                          <ToolbarRegenerateButton
                            isRegenerating={
                              contributionRegeneratingId === contrib.id
                            }
                            onOpen={() =>
                              contributionInlineRegenRefs.current
                                .get(contrib.id)
                                ?.openRegeneratePrompt()
                            }
                          />
                        ) : undefined
                      }
                    />
                  </div>
                )
              ) : null
            }
          >
            <div
              className="space-y-3"
              onFocus={() => setEditingContributionId(contrib.id)}
              onBlur={(e) => {
                const related = e.relatedTarget as Node | null
                if (
                  related &&
                  e.currentTarget.parentElement?.contains(related)
                ) {
                  return
                }
                if (
                  related instanceof Element &&
                  related.closest(
                    `[data-contribution-format-toolbar="${contrib.id}"]`,
                  )
                ) {
                  return
                }
                if (
                  related instanceof Element &&
                  related.closest("[data-regenerate-area]")
                ) {
                  return
                }
                setEditingContributionId(null)
              }}
            >
              <InlineEdit
                ref={(el) => {
                  if (el) {
                    contributionInlineRegenRefs.current.set(contrib.id, el)
                  } else {
                    contributionInlineRegenRefs.current.delete(contrib.id)
                  }
                }}
                value={contrib.message}
                onChange={(v) => onContributionEdit!(contrib.id, v)}
                editable
                onRegenerate={
                  onContributionRegenerateMessage
                    ? (prompt) =>
                        onContributionRegenerateMessage(contrib.id, prompt)
                    : undefined
                }
                isRegenerating={contributionRegeneratingId === contrib.id}
                regeneratePlacement={
                  onContributionRegenerateMessage ? "toolbar" : "floating"
                }
                regenerateShimmerTone="paper"
                onRegeneratePromptOpenChange={(open) => {
                  setRegeneratePromptScopeKey(open ? contrib.id : null)
                  if (!open) setRegeneratePromptDraft("")
                }}
                toolbarRegeneratePrompt={
                  onContributionRegenerateMessage
                    ? {
                        value: regeneratePromptDraft,
                        onChange: setRegeneratePromptDraft,
                      }
                    : undefined
                }
                className="min-h-[1.5em] leading-relaxed whitespace-pre-wrap text-foreground/90"
                style={{
                  fontSize: `${snapMessageFontSize(contrib.font_size ?? messageFontSize)}px`,
                  ...(contrib.text_color ? { color: contrib.text_color } : {}),
                }}
                placeholder="Type your message…"
              />
            </div>
          </DraggableWrapper>
        )
      }

      return (
        <DraggableWrapper
          key={contrib.id}
          initialOffset={
            typeof contrib.position_x === "number" &&
            typeof contrib.position_y === "number"
              ? { x: contrib.position_x, y: contrib.position_y }
              : undefined
          }
          initialWidthPercent={
            typeof contrib.width_percent === "number"
              ? contrib.width_percent
              : undefined
          }
          rotationDegrees={contrib.rotation_degrees ?? 0}
        >
          <p
            className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90"
            style={{
              fontSize: `${snapMessageFontSize(contrib.font_size ?? messageFontSize)}px`,
              ...(contrib.text_color ? { color: contrib.text_color } : {}),
            }}
          >
            {contrib.message}
          </p>
        </DraggableWrapper>
      )
    })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md">
        {contributeOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">
            {typeof contributeOverlay === "function"
              ? contributeOverlay({ currentPage })
              : contributeOverlay}
          </div>
        ) : null}
        <div className="relative flex min-h-[500px] w-full flex-col overflow-visible rounded-2xl shadow-xl ring-1 ring-black/5 transition-transform duration-500 ease-out hover:shadow-2xl dark:ring-white/10">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900" />
            <div
              className="absolute inset-0 opacity-[0.04] mix-blend-multiply dark:opacity-[0.02] dark:mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
              }}
            />
            {currentPage > 0 && (
              <div className="absolute top-0 bottom-0 left-0 z-10 w-12 bg-linear-to-r from-black/6 to-transparent dark:from-black/20" />
            )}
          </div>

          <div className="relative z-10 flex flex-1 flex-col">
            {currentPage === 0 ? (
              <div className="relative flex flex-1 flex-col">
                {isGeneratingImage ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Spinner className="h-10 w-10" />
                      <p className="text-sm text-muted-foreground">
                        Creating your card...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {imageUrl && (
                      <div
                        className={`group/image relative w-full flex-1 overflow-hidden rounded-2xl transition-all ${isRegeneratingImage ? "opacity-90" : ""}`}
                      >
                        <Image
                          key={
                            imageUrl.length > 128
                              ? `${imageUrl.length}:${imageUrl.slice(-64)}`
                              : imageUrl
                          }
                          src={imageUrl}
                          alt="Card cover"
                          fill
                          className="object-cover"
                          crossOrigin={
                            looksLikeDataUrl(imageUrl) ? undefined : "anonymous"
                          }
                          priority
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                        {isRegeneratingImage ? (
                          <RegenerateShimmerOverlay
                            tone="cover"
                            className="z-20 rounded-2xl"
                          />
                        ) : null}

                        {editable && onRegenerateImage && !showImagePrompt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowImagePrompt(true)
                            }}
                            disabled={isRegeneratingImage || isGeneratingImage}
                            className="absolute top-4 right-4 z-30 rounded-full bg-primary p-2 text-primary-foreground opacity-100 shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 md:opacity-0 md:group-hover/image:opacity-100"
                            title="Regenerate image with AI"
                          >
                            {isRegeneratingImage || isGeneratingImage ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {showImagePrompt && (
                          <div
                            className="absolute top-4 right-4 left-4 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-lg">
                              <input
                                ref={imagePromptRef}
                                type="text"
                                value={imagePromptText}
                                onChange={(e) =>
                                  setImagePromptText(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    imagePromptText.trim()
                                  ) {
                                    void onRegenerateImage?.(
                                      imagePromptText.trim(),
                                      sourceImageUrlForRefineRequest(
                                        imageUrl || undefined,
                                      ),
                                    )
                                    setImagePromptText("")
                                    setShowImagePrompt(false)
                                  }
                                  if (e.key === "Escape") {
                                    setShowImagePrompt(false)
                                    setImagePromptText("")
                                  }
                                }}
                                placeholder="Describe the image you want..."
                                className="min-w-0 flex-1 border-none bg-transparent px-2 py-1 text-base text-foreground outline-none sm:text-sm"
                                disabled={isRegeneratingImage}
                              />
                              <button
                                onClick={() => {
                                  if (imagePromptText.trim()) {
                                    void onRegenerateImage?.(
                                      imagePromptText.trim(),
                                      sourceImageUrlForRefineRequest(
                                        imageUrl || undefined,
                                      ),
                                    )
                                    setImagePromptText("")
                                    setShowImagePrompt(false)
                                  }
                                }}
                                disabled={
                                  isRegeneratingImage || !imagePromptText.trim()
                                }
                                className="rounded-full bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                title="Generate"
                              >
                                {isRegeneratingImage ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <ArrowUp className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowImagePrompt(false)
                                  setImagePromptText("")
                                }}
                                className="rounded-full p-1.5 transition-colors hover:bg-muted"
                                title="Cancel"
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="absolute right-0 bottom-0 left-0 p-6 text-white">
                      <InlineEdit
                        value={headline}
                        onChange={onHeadlineChange}
                        editable={editable}
                        onRegenerate={onRegenerateHeadline}
                        isRegenerating={isRegeneratingHeadline}
                        regenerateShimmerTone="cover"
                        className="block text-2xl font-bold text-white drop-shadow-lg md:text-3xl"
                        placeholder="Add a headline"
                        placeholderClassName="text-white/45"
                      />
                      <p className="mt-2 text-sm opacity-80">
                        For {recipientName}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div
                className="relative flex min-h-[460px] flex-1 flex-col p-1"
                data-card-canvas
              >
                <p className="mb-1 shrink-0 px-5 pt-5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {MESSAGES_SECTION_LABEL}
                </p>

                <div className="relative min-h-[380px] flex-1">
                  {!composeDraft && onComposeCanvasPlace && (
                    <button
                      type="button"
                      className="absolute inset-0 z-0 cursor-crosshair"
                      aria-label="Click to place your note"
                      onClick={reportComposePlace}
                    />
                  )}

                  {!composeDraft &&
                    onComposeCanvasPlace &&
                    getContributionsForPage(currentPage).length === 0 && (
                      <ComposeCanvasEmptyHint
                        variant={
                          isMessagePage && showMainSpreadInnerBody
                            ? "anchored"
                            : "centered"
                        }
                      />
                    )}

                  {isMessagePage && showMainSpreadInnerBody ? (
                    <div className="pointer-events-none relative z-10 flex min-h-[360px] flex-col justify-center *:pointer-events-auto">
                      <DraggableWrapper
                        editable={editable}
                        footer={
                          editable &&
                          !editingContributionOnCanvas &&
                          !(
                            composeDraft &&
                            composeDraft.pageIndex === currentPage
                          ) ? (
                            regeneratePromptScopeKey === "__main__" &&
                            onRegenerateMessage ? (
                              <div data-regenerate-area>
                                <RegeneratePromptBar
                                  className="w-full max-w-none"
                                  value={regeneratePromptDraft}
                                  onValueChange={setRegeneratePromptDraft}
                                  isRegenerating={isRegeneratingMessage}
                                  onSubmit={() =>
                                    void mainMessageInlineRef.current?.submitRegenerateWithPrompt(
                                      regeneratePromptDraft,
                                    )
                                  }
                                  onCancel={() =>
                                    mainMessageInlineRef.current?.closeRegeneratePrompt()
                                  }
                                />
                              </div>
                            ) : (
                              <MessageFormattingToolbar
                                className="flex w-full max-w-none"
                                fontSize={messageFontSize}
                                onFontSizeChange={(px) =>
                                  onMessageFontSizeChange?.(px)
                                }
                                textColor={messageTextColor ?? null}
                                onTextColorChange={
                                  onMessageTextColorChange
                                    ? (hex) => onMessageTextColorChange(hex)
                                    : undefined
                                }
                                rotationDegrees={undefined}
                                showPage={totalPages > 1}
                                pageValue={validMessagePage}
                                onPageChange={(newPage) => {
                                  onMessagePageIndexChange?.(newPage)
                                  setCurrentPage(newPage)
                                }}
                                totalPages={totalPages}
                                aiTweakSlot={
                                  onRegenerateMessage ? (
                                    <ToolbarRegenerateButton
                                      isRegenerating={isRegeneratingMessage}
                                      onOpen={() =>
                                        mainMessageInlineRef.current?.openRegeneratePrompt()
                                      }
                                    />
                                  ) : undefined
                                }
                              />
                            )
                          ) : null
                        }
                      >
                        <div className="space-y-3">
                          <InlineEdit
                            ref={mainMessageInlineRef}
                            value={message}
                            onChange={onMessageChange}
                            editable={editable}
                            onRegenerate={onRegenerateMessage}
                            isRegenerating={isRegeneratingMessage}
                            regeneratePlacement={
                              onRegenerateMessage ? "toolbar" : "floating"
                            }
                            regenerateShimmerTone="paper"
                            onRegeneratePromptOpenChange={(open) => {
                              setRegeneratePromptScopeKey(
                                open ? "__main__" : null,
                              )
                              if (!open) setRegeneratePromptDraft("")
                            }}
                            toolbarRegeneratePrompt={
                              onRegenerateMessage
                                ? {
                                    value: regeneratePromptDraft,
                                    onChange: setRegeneratePromptDraft,
                                  }
                                : undefined
                            }
                            className="min-h-[1.75em] leading-relaxed whitespace-pre-wrap text-foreground/90"
                            style={{
                              fontSize: `${snapMessageFontSize(messageFontSize)}px`,
                              ...(messageTextColor
                                ? { color: messageTextColor }
                                : {}),
                            }}
                            placeholder="Write the message that appears inside your card…"
                          />
                        </div>
                      </DraggableWrapper>
                    </div>
                  ) : null}

                  <div className="pointer-events-none absolute inset-0 z-20 *:pointer-events-auto">
                    {renderContributionsForPage(currentPage)}
                  </div>

                  <div className="pointer-events-none absolute inset-0 z-30 *:pointer-events-auto">
                    {composeDraft &&
                      composeDraft.pageIndex === currentPage &&
                      onComposeDraftChange &&
                      onComposeSubmit && (
                        <ComposeDraftEditor
                          composeDraft={composeDraft}
                          messageFontSize={messageFontSize}
                          composeError={composeError ?? null}
                          onComposeDraftChange={handleComposeDraftPatch}
                          onComposeDraftRegenerateMessage={
                            onComposeDraftRegenerateMessage
                          }
                          composeDraftRegenerating={composeDraftRegenerating}
                          totalPages={totalPages}
                          onSelectInnerPage={handleComposeInnerPageSelect}
                        />
                      )}
                  </div>

                  {!isMessagePage &&
                    !composeDraft &&
                    !onComposeCanvasPlace &&
                    getContributionsForPage(currentPage).length === 0 && (
                      <div className="flex h-full min-h-[200px] flex-1 items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <p className="mb-2 text-lg">
                            Space reserved for messages
                          </p>
                          <p className="text-sm">
                            Share the contributor link to let others add their
                            messages here
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i === currentPage
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() =>
              isLastPage && editable
                ? handleAddPage()
                : goToPage(currentPage + 1)
            }
            disabled={!canGoRight && !editable}
            title={isLastPage && editable ? "Add a new page" : "Next page"}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      ) : null}

      {composeDraft &&
        composeDraft.pageIndex === currentPage &&
        onComposeSubmit && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-6 pb-2">
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onComposeSubmit()
              }}
              disabled={composeSubmitting}
              className="w-40"
            >
              {composeSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving…
                </>
              ) : (
                "Save message"
              )}
            </Button>
            {onComposeCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onComposeCancel()
                }}
                disabled={composeSubmitting}
                className="w-40"
              >
                Cancel
              </Button>
            )}
          </div>
        )}
    </div>
  )
}
