"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Card3DProps } from "./types"
import {
  RegenerateShimmerOverlay,
  InlineEdit,
  type InlineEditRegenerateHandle,
} from "./inline-edit"
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
  contributionHasCanvasPosition,
  contributionPageIndex,
  toFiniteLayoutNumber,
} from "@/lib/contribution-layout"
import { looksLikeDataUrl } from "@/lib/source-image-limits"
import { getMessageFontFamily } from "@/lib/message-font-presets"
import { GiphyPicker } from "./giphy-picker"
import { GiphyCanvasGif } from "./giphy-canvas-gif"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
const COMPOSE_DRAFT_GIF_TARGET = "__compose__"

export function Card3D({
  imageUrl,
  headline,
  message,
  senderName,
  recipientName,
  isGeneratingImage,
  isGeneratingHeadline = false,
  contributions = [],
  editable = false,
  onHeadlineChange,
  onMessageChange,
  onAddPage,
  extraPages = 0,
  isRegeneratingHeadline = false,
  isRegeneratingImage = false,
  messageFontSize = 18,
  messageTextColor,
  messagePageIndex = 1,
  initialPage = 0,
  contributeOverlay,
  contributeSubmitNonce = 0,
  editableContributionIds = [],
  onContributionEdit,
  onContributionGifChange,
  onContributionLayoutChange,
  contributionRegeneratingId = null,
  autoFocusContributionId = null,
  composeDraft = null,
  onComposeDraftChange,
  onComposeDraftGifChange,
  onComposeCanvasPlace,
  onComposeSubmit,
  onComposeCancel,
  composeSubmitting = false,
  composeError = null,
  onComposeDraftRegenerateMessage,
  composeDraftRegenerating = false,
  coverOnly = false,
  suppressComposeActions = false,
  onEditingContributionChange,
  navigateToPage,
}: Card3DProps) {
  void senderName
  const [currentPage, setCurrentPage] = useState(coverOnly ? 0 : initialPage)
  const [prevNavigateToPage, setPrevNavigateToPage] = useState(navigateToPage)
  if (navigateToPage !== prevNavigateToPage) {
    setPrevNavigateToPage(navigateToPage)
    if (navigateToPage !== undefined) setCurrentPage(navigateToPage)
  }
  const [gifPickerContributionId, setGifPickerContributionId] = useState<
    string | null
  >(null)
  const lastContributeSubmitNavNonce = useRef(0)
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

  const [committedSpread, setCommittedSpread] =
    useState<CommittedSpreadSnapshot | null>(null)

  const naturalPageSpread = useMemo(
    () =>
      computeNaturalPageSpread(
        coverOnly,
        messagePageIndex,
        contributions,
        extraPages,
      ),
    [coverOnly, messagePageIndex, contributions, extraPages],
  )

  const { totalPages, validMessagePage } = useMemo(
    () =>
      capSpreadToCommitted(
        naturalPageSpread,
        committedSpread,
        messagePageIndex,
        extraPages,
        coverOnly,
      ),
    [
      naturalPageSpread,
      committedSpread,
      messagePageIndex,
      extraPages,
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
        const next: CommittedSpreadSnapshot = { totalPages, extraPages }
        if (
          prev &&
          prev.totalPages === next.totalPages &&
          prev.extraPages === next.extraPages
        ) {
          return prev
        }
        return next
      })
    })
  }, [coverOnly, totalPages, extraPages])

  const effectiveContributionPage = (
    contrib: (typeof contributions)[number],
  ) => {
    const page = toFiniteLayoutNumber(contrib.page_index)
    if (page !== null && page >= 0) {
      return page
    }
    if (contrib.is_creator) {
      return validMessagePage
    }
    return validMessagePage + 1
  }

  const isMessagePage = !coverOnly && currentPage === validMessagePage

  const showMainSpreadInnerBody = message.trim().length > 0

  useEffect(() => {
    if (coverOnly) return
    if (contributeSubmitNonce <= 0) return
    if (contributeSubmitNonce <= lastContributeSubmitNavNonce.current) return
    lastContributeSubmitNavNonce.current = contributeSubmitNonce

    const last = contributions[contributions.length - 1]
    if (!last) return

    const pageIdx = contributionPageIndex(
      last,
      last.is_creator ? validMessagePage : validMessagePage + 1,
    )
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
    !coverOnly && (currentPage < totalPages - 1 || onAddPage !== undefined)

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

  const gifPickerSelectedUrl = useMemo(
    () =>
      contributions.find((c) => c.id === gifPickerContributionId)?.giphy_url ??
      null,
    [contributions, gifPickerContributionId],
  )

  const isRenderableCanvasContribution = (
    contribution: (typeof contributions)[number],
  ) =>
    !(contribution.is_creator && !contributionHasCanvasPosition(contribution))

  const getContributionsForPage = (pageIdx: number) =>
    contributions.filter(
      (contribution) =>
        isRenderableCanvasContribution(contribution) &&
        effectiveContributionPage(contribution) === pageIdx,
    )

  const showComposePlaceHint =
    !composeDraft &&
    onComposeCanvasPlace &&
    currentPage > 0 &&
    getContributionsForPage(currentPage).length === 0

  const renderContributionsForPage = (pageIdx: number) => {
    const editableSet = new Set(editableContributionIds)
    const pageContributions = [...getContributionsForPage(pageIdx)].sort(
      (a, b) => {
        const aEditable = editableSet.has(a.id) ? 1 : 0
        const bEditable = editableSet.has(b.id) ? 1 : 0
        return aEditable - bEditable
      },
    )
    return pageContributions.map((contrib) => {
      const canCanvasEdit =
        Boolean(onContributionEdit) &&
        editableContributionIds.includes(contrib.id)
      const messageFontFamily = getMessageFontFamily(contrib.font_family)

      if (canCanvasEdit) {
        return (
          <DraggableWrapper
            key={contrib.id}
            editable
            initialOffset={
              contributionHasCanvasPosition(contrib)
                ? {
                    x: toFiniteLayoutNumber(contrib.position_x)!,
                    y: toFiniteLayoutNumber(contrib.position_y)!,
                  }
                : undefined
            }
            initialWidthPercent={
              toFiniteLayoutNumber(contrib.width_percent) ?? undefined
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
            onFocusLeave={() => {
              contributionInlineRegenRefs.current
                .get(contrib.id)
                ?.closeRegeneratePrompt()
              onEditingContributionChange?.(null)
            }}
          >
            <div
              className="space-y-3"
              onFocus={() => {
                onEditingContributionChange?.(contrib.id)
              }}
            >
              {contrib.giphy_url ? (
                <div className="flex w-full justify-center overflow-hidden rounded-md">
                  <GiphyCanvasGif src={contrib.giphy_url} alt="Attached GIF" />
                </div>
              ) : null}
              <InlineEdit
                ref={(el) => {
                  if (el) {
                    contributionInlineRegenRefs.current.set(contrib.id, el)
                  } else {
                    contributionInlineRegenRefs.current.delete(contrib.id)
                  }
                }}
                value={contrib.message ?? ""}
                onChange={(v) => onContributionEdit!(contrib.id, v)}
                editable
                isRegenerating={contributionRegeneratingId === contrib.id}
                regenerateShimmerTone="paper"
                className="min-h-[1.5em] leading-relaxed whitespace-pre-wrap text-foreground/90"
                style={{
                  fontSize: `${contrib.font_size ?? messageFontSize}px`,
                  ...(contrib.text_color ? { color: contrib.text_color } : {}),
                  ...(messageFontFamily
                    ? { fontFamily: messageFontFamily }
                    : {}),
                }}
                placeholder="Type your message…"
                autoFocus={contrib.id === autoFocusContributionId}
              />
            </div>
          </DraggableWrapper>
        )
      }

      return (
        <DraggableWrapper
          key={contrib.id}
          initialOffset={
            contributionHasCanvasPosition(contrib)
              ? {
                  x: toFiniteLayoutNumber(contrib.position_x)!,
                  y: toFiniteLayoutNumber(contrib.position_y)!,
                }
              : undefined
          }
          initialWidthPercent={
            toFiniteLayoutNumber(contrib.width_percent) ?? undefined
          }
          rotationDegrees={contrib.rotation_degrees ?? 0}
        >
          <div className="space-y-3">
            {contrib.giphy_url ? (
              <div className="flex w-full justify-center overflow-hidden rounded-md">
                <GiphyCanvasGif src={contrib.giphy_url} alt="Attached GIF" />
              </div>
            ) : null}
            {contrib.message ? (
              <p
                className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90"
                style={{
                  fontSize: `${contrib.font_size ?? messageFontSize}px`,
                  ...(contrib.text_color ? { color: contrib.text_color } : {}),
                  ...(messageFontFamily
                    ? { fontFamily: messageFontFamily }
                    : {}),
                }}
              >
                {contrib.message}
              </p>
            ) : null}
          </div>
        </DraggableWrapper>
      )
    })
  }

  return (
    <div className="flex w-full flex-col items-center gap-12">
      <div className="relative w-full max-w-md">
        {contributeOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">
            {typeof contributeOverlay === "function"
              ? contributeOverlay({ currentPage })
              : contributeOverlay}
          </div>
        ) : null}
        <div className="relative flex card-preview-frame flex-col overflow-visible rounded-2xl shadow-xl ring-1 ring-black/5 transition-transform duration-500 ease-out dark:ring-white/10">
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
                <>
                  {isGeneratingImage && !imageUrl ? (
                    <div className="relative min-h-[280px] w-full flex-1 overflow-hidden rounded-2xl bg-border">
                      <RegenerateShimmerOverlay
                        tone="cover"
                        className="z-10 rounded-2xl"
                      />
                    </div>
                  ) : imageUrl ? (
                    <div
                      className={`group/image relative w-full flex-1 overflow-hidden rounded-2xl transition-all ${isRegeneratingImage || isGeneratingImage ? "opacity-90" : ""}`}
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
                        sizes="(max-width: 1024px) 100vw, 448px"
                        className="object-cover"
                        crossOrigin={
                          looksLikeDataUrl(imageUrl) ? undefined : "anonymous"
                        }
                        unoptimized={looksLikeDataUrl(imageUrl)}
                        priority
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                      {isRegeneratingImage || isGeneratingImage ? (
                        <RegenerateShimmerOverlay
                          tone="cover"
                          className="z-20 rounded-2xl"
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <div className="absolute right-0 bottom-0 left-0 p-6 text-center text-white">
                    <InlineEdit
                      value={headline}
                      onChange={onHeadlineChange}
                      editable={editable}
                      isRegenerating={isRegeneratingHeadline}
                      isGenerating={isGeneratingHeadline}
                      regenerateShimmerTone="cover"
                      className="-mx-1 mt-2 max-w-md text-3xl leading-tight font-bold text-white"
                      placeholder="Add a headline"
                      placeholderClassName="my-0 text-white/45"
                    />
                    <p className="mt-2 text-sm opacity-80">
                      For {recipientName}
                    </p>
                  </div>
                </>
              </div>
            ) : (
              <div
                className="relative flex min-h-[460px] flex-1 flex-col overscroll-contain p-1"
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

                  {showComposePlaceHint ? (
                    <ComposeCanvasEmptyHint
                      variant={
                        isMessagePage && showMainSpreadInnerBody
                          ? "anchored"
                          : "centered"
                      }
                    />
                  ) : null}

                  {isMessagePage && showMainSpreadInnerBody ? (
                    <div className="pointer-events-none relative z-10 flex min-h-[360px] flex-col justify-center *:pointer-events-auto">
                      <DraggableWrapper editable={editable}>
                        <div className="space-y-3">
                          <InlineEdit
                            value={message}
                            onChange={onMessageChange}
                            editable={editable}
                            regenerateShimmerTone="paper"
                            className="min-h-[1.75em] leading-relaxed whitespace-pre-wrap text-foreground/90"
                            style={{
                              fontSize: `${messageFontSize}px`,
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
                        />
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft />
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPage(i)}
                className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${
                  i === currentPage
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              isLastPage && onAddPage
                ? handleAddPage()
                : goToPage(currentPage + 1)
            }
            disabled={!canGoRight}
            title={isLastPage && onAddPage ? "Add a new page" : "Next page"}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}

      {!suppressComposeActions &&
        composeDraft &&
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
                  <Spinner />
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
      <GiphyPicker
        open={Boolean(gifPickerContributionId)}
        onOpenChange={(open) => {
          if (!open) setGifPickerContributionId(null)
        }}
        selectedUrl={
          gifPickerContributionId === COMPOSE_DRAFT_GIF_TARGET
            ? (composeDraft?.giphyUrl ?? null)
            : gifPickerSelectedUrl
        }
        onSelect={(url) => {
          if (!gifPickerContributionId) return
          if (gifPickerContributionId === COMPOSE_DRAFT_GIF_TARGET) {
            onComposeDraftGifChange?.(url)
            return
          }
          if (!onContributionGifChange) return
          onContributionGifChange(gifPickerContributionId, url)
        }}
      />
    </div>
  )
}
