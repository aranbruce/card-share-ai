'use client'

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from 'react'
import type { CardComposeDraft } from '@/lib/card-compose-draft'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  Move,
  Maximize2,
  Sparkles,
  X,
  Send,
} from 'lucide-react'

interface Card3DProps {
  imageUrl: string
  headline: string
  message: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  contributions?: Array<{
    id: string
    message: string
    position_x?: number | null
    position_y?: number | null
    width_percent?: number | null
    page_index?: number | null
    font_size?: number | null
    is_creator?: boolean | null
  }>
  editable?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onAddPage?: () => void
  extraPages?: number
  onRegenerateHeadline?: (prompt: string) => Promise<void>
  onRegenerateMessage?: (prompt: string) => Promise<void>
  onRegenerateImage?: (prompt: string) => Promise<void>
  isRegeneratingHeadline?: boolean
  isRegeneratingMessage?: boolean
  isRegeneratingImage?: boolean
  messageFontSize?: number
  onMessageFontSizeChange?: (size: number) => void
  messagePageIndex?: number
  onMessagePageIndexChange?: (page: number) => void
  /** Initial spread page when the card mounts (0 = cover). */
  initialPage?: number
  /** Only the cover page (no inner message / pagination) — e.g. create flow before save. */
  coverOnly?: boolean
  /**
   * Hide the legacy centered “card body” editor when it would be empty and unused
   * (canvas notes / compose flow only). Keeps the cover editable via `editable`.
   */
  hideEmptyCenterMessageBody?: boolean
  /** Rendered above card content. Use a function to read `currentPage` (0 = cover). */
  contributeOverlay?: ReactNode | ((ctx: { currentPage: number }) => ReactNode)
  /** Increment after a successful contribution submit to flip to the messages page. */
  contributeSubmitNonce?: number
  /** IDs of contributions this visitor may drag/edit (must match secrets they received when posting). */
  editableContributionIds?: string[]
  /** Fired when an editable contribution’s message changes (blur on InlineEdit). */
  onContributionEdit?: (contributionId: string, value: string) => void
  onContributionLayoutChange?: (
    contributionId: string,
    layout: {
      x: number
      y: number
      widthPercent: number
      pageIndex: number
      fontSize?: number
    },
  ) => void
  onContributionRegenerateMessage?: (
    contributionId: string,
    prompt: string,
  ) => Promise<void>
  contributionRegeneratingId?: string | null
  /** Extra blank page slot for new canvas notes (contribute flow). */
  composePageBump?: number
  composeDraft?: CardComposeDraft | null
  onComposeDraftChange?: (patch: Partial<CardComposeDraft>) => void
  /** Click on the card canvas to place a new note (offset matches the click overlay / placement area). */
  onComposeCanvasPlace?: (pt: {
    x: number
    y: number
    pageIndex: number
  }) => void
  onComposeSubmit?: () => void
  onComposeCancel?: () => void
  composeSubmitting?: boolean
  composeError?: string | null
  onComposeDraftRegenerateMessage?: (prompt: string) => Promise<void>
  composeDraftRegenerating?: boolean
}

const MESSAGES_SECTION_LABEL = 'Messages'

function RegenerateShimmerOverlay({
  tone,
  className,
}: {
  tone: 'cover' | 'paper'
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-[30] overflow-hidden',
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-0',
          tone === 'cover'
            ? 'ai-refine-shimmer-sweep-cover'
            : 'ai-refine-shimmer-sweep-paper',
        )}
      />
    </div>
  )
}

/** Used to center the compose block on click before first layout (field + controls). */
const COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX = 108

/** Matches padding used in `DraggableWrapper` clamping (inside the positioning box). */
const CANVAS_EDGE_PADDING = 12

/** Containing block for `position: absolute` on the draggable — same box `left`/`top` use. */
function getDraggableBoundsParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null
  const fromOffset = el.offsetParent as HTMLElement | null
  if (fromOffset) return fromOffset
  return el.closest('[data-card-canvas]') as HTMLElement | null
}

function ComposeCanvasEmptyHint({
  variant,
}: {
  variant: 'anchored' | 'centered'
}) {
  return (
    <div
      className={
        variant === 'centered'
          ? 'pointer-events-none absolute inset-0 z-1 flex items-center justify-center px-8'
          : 'pointer-events-none absolute right-0 bottom-5 left-0 z-1 flex justify-center px-6'
      }
      aria-hidden
    >
      <p className="max-w-60 text-center text-[11px] leading-snug font-medium text-muted-foreground/50 dark:text-muted-foreground/45">
        Click anywhere to place a note
      </p>
    </div>
  )
}

type InlineEditRegenerateHandle = {
  openRegeneratePrompt: () => void
}

type InlineEditProps = {
  value: string
  onChange?: (value: string) => void
  className?: string
  style?: React.CSSProperties
  editable?: boolean
  onRegenerate?: (prompt: string) => Promise<void>
  isRegenerating?: boolean
  /** Hint when the field is empty (editable mode). */
  placeholder?: string
  /** Muted placeholder on light pages; use e.g. `text-white/45` on the cover headline. */
  placeholderClassName?: string
  onFocusChange?: (focused: boolean) => void
  /**
   * `floating`: sparkle on the text edge (cover headline).
   * `toolbar`: hide sparkle; call `ref.openRegeneratePrompt()` from Size/Page toolbar.
   */
  regeneratePlacement?: 'floating' | 'toolbar'
  /** Sweep style: bright on dark cover vs subtle on light message paper */
  regenerateShimmerTone?: 'cover' | 'paper'
  /** Start in edit mode and focus the field (e.g. right after click-to-place compose). */
  autoFocus?: boolean
}

// Inline edit component - uses contentEditable for truly identical sizing
const InlineEdit = forwardRef<
  InlineEditRegenerateHandle | null,
  InlineEditProps
>(function InlineEdit(
  {
    value,
    onChange,
    className,
    style,
    editable = false,
    onRegenerate,
    isRegenerating = false,
    placeholder,
    placeholderClassName = 'text-muted-foreground/45',
    onFocusChange,
    regeneratePlacement = 'floating',
    regenerateShimmerTone = 'cover',
    autoFocus = false,
  },
  ref,
) {
  const [isEditing, setIsEditing] = useState(() => autoFocus)
  const [showPromptInput, setShowPromptInput] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [promptPosition, setPromptPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })
  const [editSurfaceEmpty, setEditSurfaceEmpty] = useState(!value.trim())
  const editRef = useRef<HTMLDivElement>(null)
  const promptInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onFocusChange) {
      onFocusChange(isEditing)
    }
  }, [isEditing, onFocusChange])

  const showIdlePlaceholder = Boolean(
    placeholder && editable && onChange && !isEditing && !value.trim(),
  )
  const showActivePlaceholder = Boolean(
    placeholder && editable && onChange && isEditing && editSurfaceEmpty,
  )

  const handleClick = (e: React.MouseEvent) => {
    if (editable && onChange) {
      e.stopPropagation()
      setIsEditing(true)
    }
  }

  useLayoutEffect(() => {
    if (!isEditing || !editRef.current) return
    editRef.current.focus()
    const range = document.createRange()
    range.selectNodeContents(editRef.current)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    queueMicrotask(() => {
      setEditSurfaceEmpty(!(editRef.current?.innerText || '').trim())
    })
  }, [isEditing])

  useEffect(() => {
    const syncEmptyFromValue = () => setEditSurfaceEmpty(!value.trim())
    if (isEditing) {
      // External updates (e.g. AI regenerate) can change `value` while focused; placeholder must follow.
      syncEmptyFromValue()
      return
    }
    queueMicrotask(syncEmptyFromValue)
  }, [value, isEditing])

  useEffect(() => {
    if (showPromptInput) {
      // Calculate position for fixed prompt input
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setPromptPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        })
      }
      // Focus input after position is set
      setTimeout(() => {
        promptInputRef.current?.focus()
      }, 0)
    }
  }, [showPromptInput])

  const handleBlur = (e: React.FocusEvent) => {
    // Don't blur if clicking the regenerate button or prompt input
    if (e.relatedTarget?.closest('[data-regenerate-area]')) {
      return
    }
    // Drag/resize handles use tabIndex={-1} so focus can move here without exiting edit mode
    if (e.relatedTarget?.closest('[data-note-chrome]')) {
      return
    }
    setIsEditing(false)
    if (editRef.current) {
      const newValue = editRef.current.innerText
      setEditSurfaceEmpty(!newValue.trim())
      if (newValue !== value) {
        onChange?.(newValue)
      }
    }
  }

  const syncEditEmptyFromDom = () => {
    if (!editRef.current) return
    setEditSurfaceEmpty(!(editRef.current.innerText || '').trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (editRef.current) {
        editRef.current.innerText = value
        setEditSurfaceEmpty(!value.trim())
      }
      setIsEditing(false)
      setShowPromptInput(false)
    }
  }

  const handleSparkleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowPromptInput(true)
  }

  useImperativeHandle(
    ref,
    () => ({
      openRegeneratePrompt: () => {
        if (!editable || !onRegenerate) return
        setShowPromptInput(true)
      },
    }),
    [editable, onRegenerate],
  )

  const handleRegenerate = async () => {
    if (onRegenerate && prompt.trim()) {
      await onRegenerate(prompt.trim())
      setPrompt('')
      setShowPromptInput(false)
    }
  }

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRegenerate()
    }
    if (e.key === 'Escape') {
      setShowPromptInput(false)
      setPrompt('')
    }
  }

  const showFloatingRegenerate =
    editable &&
    onRegenerate &&
    !showPromptInput &&
    regeneratePlacement === 'floating'

  return (
    <div
      ref={containerRef}
      className="group relative"
      onMouseLeave={() => {
        if (!isEditing && !showPromptInput) {
          setShowPromptInput(false)
        }
      }}
    >
      {isEditing ? (
        <div
          className={`relative block min-h-[1.4em] w-full ${isRegenerating ? 'opacity-90' : ''}`}
        >
          {isRegenerating ? (
            <RegenerateShimmerOverlay tone={regenerateShimmerTone} />
          ) : null}
          {showActivePlaceholder ? (
            <span
              className={`pointer-events-none absolute top-0 left-0 z-0 block w-full whitespace-pre-wrap select-none ${className ?? ''} ${placeholderClassName}`}
              style={style}
              aria-hidden
            >
              {placeholder}
            </span>
          ) : null}
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={syncEditEmptyFromDom}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 min-h-[1.4em] outline-none ${className ?? ''}`}
            style={style}
          >
            {value}
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`relative ${className} ${editable ? '-mx-1 cursor-text rounded px-1 transition-colors hover:bg-primary/5' : ''} ${isRegenerating ? 'opacity-90' : ''}`}
          style={style}
        >
          {isRegenerating ? (
            <RegenerateShimmerOverlay tone={regenerateShimmerTone} />
          ) : null}
          {showIdlePlaceholder ? (
            <span className={`${className ?? ''} ${placeholderClassName}`}>
              {placeholder}
            </span>
          ) : (
            value
          )}
        </div>
      )}

      {/* Sparkle on text edge — cover headline; canvas messages use toolbar control instead */}
      {showFloatingRegenerate && (
        <button
          data-regenerate-area
          onClick={handleSparkleClick}
          disabled={isRegenerating}
          className="absolute top-1/2 right-0 z-10 -translate-y-1/2 rounded-full bg-primary p-2.5 text-primary-foreground opacity-100 shadow-lg ring-2 ring-background transition-all hover:scale-110 hover:bg-primary/90 disabled:opacity-50 md:-right-12 md:opacity-0 md:group-hover:opacity-100"
          title="Rewrite with AI"
        >
          {isRegenerating ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Prompt input popover - uses fixed positioning to escape overflow:hidden */}
      {showPromptInput && (
        <div
          data-regenerate-area
          className="fixed z-[100]"
          style={{
            top: promptPosition.top,
            left: promptPosition.left,
            width: Math.max(promptPosition.width, 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-xl">
            <input
              ref={promptInputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder="Describe the change you want..."
              className="min-w-0 flex-1 border-none bg-transparent px-2 py-1 text-sm text-foreground outline-none"
              disabled={isRegenerating}
            />
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || !prompt.trim()}
              className="rounded-full bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              title="Generate"
            >
              {isRegenerating ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => {
                setShowPromptInput(false)
                setPrompt('')
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
  )
})

function ToolbarRegenerateButton({
  isRegenerating,
  onOpen,
}: {
  isRegenerating?: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      data-regenerate-area
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      disabled={isRegenerating}
      className="shrink-0 rounded-full bg-primary p-2 text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
      title="Rewrite with AI"
    >
      {isRegenerating ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
    </button>
  )
}

// Draggable wrapper for positioning content
function DraggableWrapper({
  children,
  editable = false,
  isActive = true,
  initialOffset,
  initialWidthPercent,
  onLayoutCommit,
}: {
  children: React.ReactNode
  editable?: boolean
  isActive?: boolean
  /** Pixel `left`/`top` inside the positioning containing block (same as click-to-place overlay when it aligns). */
  initialOffset?: { x: number; y: number }
  /** Default 100; placed notes often use ~75 */
  initialWidthPercent?: number
  onLayoutCommit?: (layout: {
    x: number
    y: number
    widthPercent: number
  }) => void
}) {
  const [position, setPosition] = useState<{
    x: number | null
    y: number | null
  }>(() => ({
    x: initialOffset?.x ?? null,
    y: initialOffset?.y ?? null,
  }))
  const [size, setSize] = useState({
    width: initialWidthPercent ?? (initialOffset ? 75 : 100),
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStarted, setDragStarted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, posX: 0, posY: 0, width: 100 })
  const DRAG_THRESHOLD = 5
  const CANVAS_PADDING = CANVAS_EDGE_PADDING

  const handleMouseDown = (e: React.MouseEvent, type: 'drag' | 'resize') => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()

    // On first drag, capture position relative to the same box as `left`/`top` (offsetParent)
    let currentPosX = position.x
    let currentPosY = position.y
    if (
      (currentPosX === null || currentPosY === null) &&
      containerRef.current
    ) {
      const bounds = getDraggableBoundsParent(containerRef.current)
      if (bounds) {
        const boundsRect = bounds.getBoundingClientRect()
        const selfRect = containerRef.current.getBoundingClientRect()
        currentPosX = selfRect.left - boundsRect.left
        currentPosY = selfRect.top - boundsRect.top
        setPosition({ x: currentPosX, y: currentPosY })
      } else {
        currentPosX = 0
        currentPosY = 0
      }
    }

    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      posX: currentPosX ?? 0,
      posY: currentPosY ?? 0,
      width: size.width,
    }

    if (type === 'drag') setIsDragging(true)
    if (type === 'resize') setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y

        // Only start moving after threshold to avoid jumping on click
        if (!dragStarted) {
          if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD)
            return
          setDragStarted(true)
        }

        // Clamp within the positioning box (matches `left`/`top`, not the outer canvas wrapper)
        if (containerRef.current) {
          const bounds = getDraggableBoundsParent(containerRef.current)
          if (bounds) {
            const boundsRect = bounds.getBoundingClientRect()
            const selfRect = containerRef.current.getBoundingClientRect()

            const maxX = boundsRect.width - selfRect.width - CANVAS_PADDING
            const maxY = boundsRect.height - selfRect.height - CANVAS_PADDING

            setPosition({
              x: Math.max(
                CANVAS_PADDING,
                Math.min(maxX, startPos.current.posX + dx),
              ),
              y: Math.max(
                CANVAS_PADDING,
                Math.min(maxY, startPos.current.posY + dy),
              ),
            })
          } else {
            setPosition({
              x: startPos.current.posX + dx,
              y: startPos.current.posY + dy,
            })
          }
        }
      }
      if (isResizing && containerRef.current) {
        const bounds = getDraggableBoundsParent(containerRef.current)
        const canvasWidth = bounds
          ? bounds.clientWidth - CANVAS_PADDING * 2
          : containerRef.current.parentElement?.offsetWidth || 300
        const currentLeft = position.x ?? 0
        const maxWidthPx = canvasWidth - currentLeft - CANVAS_PADDING
        const dx = e.clientX - startPos.current.x
        const newWidthPx = (startPos.current.width / 100) * canvasWidth + dx
        const clampedWidthPx = Math.max(
          canvasWidth * 0.3,
          Math.min(maxWidthPx, newWidthPx),
        )
        setSize({ width: (clampedWidthPx / canvasWidth) * 100 })
      }
    }

    const handleMouseUp = () => {
      if (
        onLayoutCommit &&
        position.x !== null &&
        position.y !== null &&
        (isDragging || isResizing)
      ) {
        onLayoutCommit({
          x: position.x,
          y: position.y,
          widthPercent: size.width,
        })
      }
      setIsDragging(false)
      setIsResizing(false)
      setDragStarted(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    isDragging,
    isResizing,
    dragStarted,
    onLayoutCommit,
    position.x,
    position.y,
    size.width,
    CANVAS_PADDING,
  ])

  useEffect(() => {
    if (!initialOffset) return
    queueMicrotask(() => {
      setPosition({ x: initialOffset.x, y: initialOffset.y })
    })
  }, [initialOffset])

  useEffect(() => {
    if (typeof initialWidthPercent !== 'number') return
    queueMicrotask(() => {
      setSize({ width: initialWidthPercent })
    })
  }, [initialWidthPercent])

  const isPositioned = position.x !== null && position.y !== null

  return (
    <div
      ref={containerRef}
      className="group relative"
      style={
        isPositioned
          ? {
              position: 'absolute',
              left: position.x ?? 0,
              top: position.y ?? 0,
              width: `${size.width}%`,
            }
          : {
              width: editable ? `${size.width}%` : '100%',
            }
      }
    >
      {editable && isActive && (
        <>
          {/* Drag handle — tabIndex keeps focus in the note so chrome does not unmount mid-drag */}
          <div
            role="button"
            tabIndex={-1}
            data-note-chrome
            aria-label="Move note"
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 cursor-move rounded-full border border-border bg-background p-1 opacity-0 shadow-sm transition-opacity outline-none group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Move className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Resize handle */}
          <div
            role="button"
            tabIndex={-1}
            data-note-chrome
            aria-label="Resize note"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
            className="absolute -right-2 -bottom-2 z-10 cursor-se-resize rounded-full border border-border bg-background p-1 opacity-0 shadow-sm transition-opacity outline-none group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Visual border */}
          <div className="pointer-events-none absolute inset-0 -m-2 rounded border border-dashed border-primary/30 p-2 transition-colors group-hover:border-primary/50" />
        </>
      )}
      {children}
    </div>
  )
}

function ComposeDraftEditor({
  composeDraft,
  messageFontSize,
  composeError,
  onComposeDraftChange,
  onComposeDraftRegenerateMessage,
  composeDraftRegenerating,
  totalPages,
}: {
  composeDraft: NonNullable<Card3DProps['composeDraft']>
  messageFontSize: number
  composeError: string | null
  onComposeDraftChange: NonNullable<Card3DProps['onComposeDraftChange']>
  onComposeDraftRegenerateMessage?: Card3DProps['onComposeDraftRegenerateMessage']
  composeDraftRegenerating: boolean
  totalPages: number
}) {
  const [isFocused, setIsFocused] = useState(false)
  const messageInlineRef = useRef<InlineEditRegenerateHandle | null>(null)

  return (
    <div
      className="absolute inset-0 z-20"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false)
        }
      }}
    >
      <DraggableWrapper
        key={`draft-${composeDraft.x}-${composeDraft.y}-${composeDraft.pageIndex}`}
        editable
        isActive={isFocused}
        initialOffset={{
          x: composeDraft.x,
          y: composeDraft.y,
        }}
        initialWidthPercent={75}
      >
        <div className="space-y-3">
          {composeError ? (
            <div className="rounded border border-destructive/20 bg-destructive/10 p-2.5 text-sm text-destructive">
              {composeError}
            </div>
          ) : null}
          <InlineEdit
            ref={messageInlineRef}
            autoFocus
            value={composeDraft.message}
            onChange={(v) => onComposeDraftChange({ message: v })}
            editable
            onRegenerate={
              onComposeDraftRegenerateMessage
                ? (prompt) => onComposeDraftRegenerateMessage(prompt)
                : undefined
            }
            isRegenerating={composeDraftRegenerating}
            regeneratePlacement={
              onComposeDraftRegenerateMessage ? 'toolbar' : 'floating'
            }
            regenerateShimmerTone="paper"
            className="min-h-[1.5em] leading-relaxed whitespace-pre-wrap text-foreground/90"
            style={{
              fontSize: `${composeDraft.fontSize ?? messageFontSize}px`,
            }}
            placeholder="Write your note…"
          />
          {isFocused && (
            <div
              className="flex items-start justify-between gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="w-8 text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                    Size
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={28}
                    value={composeDraft.fontSize ?? messageFontSize}
                    onChange={(e) =>
                      onComposeDraftChange({
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border/50 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
                {totalPages > 2 ? (
                  <div className="flex items-center gap-2">
                    <label className="w-8 text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                      Page
                    </label>
                    <select
                      value={composeDraft.pageIndex}
                      onChange={(e) =>
                        onComposeDraftChange({
                          pageIndex: Number(e.target.value),
                        })
                      }
                      className="cursor-pointer rounded border border-border/50 bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground focus:outline-none"
                    >
                      {Array.from(
                        { length: totalPages - 1 },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <option key={page} value={page}>
                          {page}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              {onComposeDraftRegenerateMessage ? (
                <ToolbarRegenerateButton
                  isRegenerating={composeDraftRegenerating}
                  onOpen={() =>
                    messageInlineRef.current?.openRegeneratePrompt()
                  }
                />
              ) : null}
            </div>
          )}
        </div>
      </DraggableWrapper>
    </div>
  )
}

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
  const [imagePromptText, setImagePromptText] = useState('')
  const imagePromptRef = useRef<HTMLInputElement>(null)
  const [editingContributionId, setEditingContributionId] = useState<
    string | null
  >(null)
  const lastContributeSubmitNavNonce = useRef(0)
  const mainMessageInlineRef = useRef<InlineEditRegenerateHandle | null>(null)
  const contributionInlineRegenRefs = useRef(
    new Map<string, InlineEditRegenerateHandle>(),
  )

  useEffect(() => {
    if (showImagePrompt && imagePromptRef.current) {
      imagePromptRef.current.focus()
    }
  }, [showImagePrompt])

  // Page 0 = cover; inner pages use per-contribution `page_index` (no fixed messages-per-page).
  const messagePageLowerBound = Math.max(1, messagePageIndex)
  const maxExplicitContributionPage = contributions.reduce((max, c) => {
    if (typeof c.page_index === 'number' && c.page_index >= 0) {
      return Math.max(max, c.page_index)
    }
    return max
  }, 0)
  const hasLegacyUnindexedContribution = contributions.some(
    (c) => !(typeof c.page_index === 'number' && c.page_index >= 0),
  )

  let lastContentPage = Math.max(
    messagePageLowerBound,
    maxExplicitContributionPage,
    hasLegacyUnindexedContribution ? messagePageLowerBound + 1 : 0,
    1,
  )
  let totalPages = coverOnly
    ? 1
    : lastContentPage + 1 + extraPages + composePageBump

  // Ensure message page is within valid range (1 to totalPages-1); unused when coverOnly
  let validMessagePage = coverOnly
    ? -1
    : Math.max(1, Math.min(messagePageIndex, totalPages - 1))

  // Legacy rows follow the main message; reserve a page after the clamped message page.
  if (!coverOnly && hasLegacyUnindexedContribution) {
    lastContentPage = Math.max(lastContentPage, validMessagePage + 1)
    totalPages = lastContentPage + 1 + extraPages + composePageBump
    validMessagePage = Math.max(1, Math.min(messagePageIndex, totalPages - 1))
  }

  const effectiveContributionPage = (
    contrib: (typeof contributions)[number],
  ) =>
    typeof contrib.page_index === 'number' && contrib.page_index >= 0
      ? contrib.page_index
      : validMessagePage + 1

  // Check if current page should show the message
  const isMessagePage = !coverOnly && currentPage === validMessagePage

  const showMainSpreadInnerBody =
    !hideEmptyCenterMessageBody ||
    message.trim().length > 0 ||
    typeof onMessageChange === 'function'

  // After a successful contribution submit, show the new note on the page where it was saved
  useEffect(() => {
    if (coverOnly) return
    if (contributeSubmitNonce <= 0) return
    if (contributeSubmitNonce <= lastContributeSubmitNavNonce.current) return
    lastContributeSubmitNavNonce.current = contributeSubmitNonce

    const last = contributions[contributions.length - 1]
    if (!last) return

    const pageIdx =
      typeof last.page_index === 'number' && last.page_index >= 0
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
    if (currentPage >= totalPages) {
      queueMicrotask(() => {
        setCurrentPage(Math.max(0, totalPages - 1))
      })
    }
  }, [totalPages, currentPage])

  const goToPage = (page: number) => {
    if (page < 0) return
    if (page < totalPages) {
      setCurrentPage(page)
    }
  }

  const handleAddPage = () => {
    if (onAddPage) {
      onAddPage()
      // Navigate to the new page after adding
      setCurrentPage(totalPages)
    }
  }

  const isLastPage = currentPage === totalPages - 1
  // Always allow right navigation when in edit mode (to add pages)
  const canGoRight =
    !coverOnly &&
    (currentPage < totalPages - 1 || (editable && onAddPage !== undefined))

  const reportComposePlace = useCallback(
    (e: React.MouseEvent) => {
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
      patch: Parameters<NonNullable<Card3DProps['onComposeDraftChange']>>[0],
    ) => {
      // Update draft first so pageIndex and currentPage stay in sync for the cancel-on-nav effect
      onComposeDraftChange?.(patch)
      if (typeof patch.pageIndex === 'number') {
        setCurrentPage(patch.pageIndex)
      }
    },
    [onComposeDraftChange, setCurrentPage],
  )

  const getContributionsForPage = (pageIdx: number) =>
    contributions.filter(
      (contrib) => effectiveContributionPage(contrib) === pageIdx,
    )

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
              typeof contrib.position_x === 'number' &&
              typeof contrib.position_y === 'number'
                ? { x: contrib.position_x, y: contrib.position_y }
                : undefined
            }
            initialWidthPercent={
              typeof contrib.width_percent === 'number'
                ? contrib.width_percent
                : undefined
            }
            onLayoutCommit={
              onContributionLayoutChange
                ? (layout) =>
                    onContributionLayoutChange(contrib.id, {
                      ...layout,
                      pageIndex: pageIdx,
                    })
                : undefined
            }
          >
            <div
              className="space-y-3"
              onFocus={() => setEditingContributionId(contrib.id)}
              onBlur={(e) => {
                const related = e.relatedTarget as Node | null
                // Handles live on the DraggableWrapper root (sibling of this div), not inside it
                if (
                  related &&
                  e.currentTarget.parentElement?.contains(related)
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
                  onContributionRegenerateMessage ? 'toolbar' : 'floating'
                }
                regenerateShimmerTone="paper"
                className="min-h-[1.5em] leading-relaxed whitespace-pre-wrap text-foreground/90"
                style={{
                  fontSize: `${contrib.font_size ?? messageFontSize}px`,
                }}
                placeholder="Type your message…"
              />
              {onContributionLayoutChange &&
              editingContributionId === contrib.id ? (
                <div
                  className="flex items-start justify-between gap-6 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="w-8 text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                        Size
                      </label>
                      <input
                        type="range"
                        min={12}
                        max={28}
                        value={contrib.font_size ?? messageFontSize}
                        onChange={(e) => {
                          const newSize = Number(e.target.value)
                          onContributionLayoutChange(contrib.id, {
                            x:
                              typeof contrib.position_x === 'number'
                                ? contrib.position_x
                                : 24,
                            y:
                              typeof contrib.position_y === 'number'
                                ? contrib.position_y
                                : 24,
                            widthPercent:
                              typeof contrib.width_percent === 'number'
                                ? contrib.width_percent
                                : 75,
                            pageIndex:
                              typeof contrib.page_index === 'number'
                                ? contrib.page_index
                                : pageIdx,
                            fontSize: newSize,
                          })
                        }}
                        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border/50 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                      />
                    </div>
                    {totalPages > 2 && (
                      <div className="flex items-center gap-2">
                        <label className="w-8 text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                          Page
                        </label>
                        <select
                          value={
                            typeof contrib.page_index === 'number'
                              ? contrib.page_index
                              : pageIdx
                          }
                          onChange={(e) => {
                            const newPage = Number(e.target.value)
                            setCurrentPage(newPage)
                            onContributionLayoutChange(contrib.id, {
                              x:
                                typeof contrib.position_x === 'number'
                                  ? contrib.position_x
                                  : 24,
                              y:
                                typeof contrib.position_y === 'number'
                                  ? contrib.position_y
                                  : 24,
                              widthPercent:
                                typeof contrib.width_percent === 'number'
                                  ? contrib.width_percent
                                  : 75,
                              pageIndex: newPage,
                              fontSize: contrib.font_size ?? messageFontSize,
                            })
                          }}
                          className="cursor-pointer rounded border border-border/50 bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground focus:outline-none"
                        >
                          {Array.from(
                            { length: totalPages - 1 },
                            (_, i) => i + 1,
                          ).map((page) => (
                            <option key={page} value={page}>
                              {page}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  {onContributionRegenerateMessage ? (
                    <ToolbarRegenerateButton
                      isRegenerating={contributionRegeneratingId === contrib.id}
                      onOpen={() =>
                        contributionInlineRegenRefs.current
                          .get(contrib.id)
                          ?.openRegeneratePrompt()
                      }
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </DraggableWrapper>
        )
      }

      return (
        <DraggableWrapper
          key={contrib.id}
          initialOffset={
            typeof contrib.position_x === 'number' &&
            typeof contrib.position_y === 'number'
              ? { x: contrib.position_x, y: contrib.position_y }
              : undefined
          }
          initialWidthPercent={
            typeof contrib.width_percent === 'number'
              ? contrib.width_percent
              : undefined
          }
        >
          <p
            className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90"
            style={{ fontSize: `${contrib.font_size ?? messageFontSize}px` }}
          >
            {contrib.message}
          </p>
        </DraggableWrapper>
      )
    })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card: background layer is clipped to rounded rect; page stack is overflow-visible for AI chrome */}
      <div className="relative w-full max-w-md">
        {contributeOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">
            {typeof contributeOverlay === 'function'
              ? contributeOverlay({ currentPage })
              : contributeOverlay}
          </div>
        ) : null}
        <div className="relative flex min-h-[500px] w-full flex-col overflow-visible rounded-2xl shadow-xl ring-1 ring-black/5 transition-transform duration-500 ease-out hover:shadow-2xl dark:ring-white/10">
          {/* Clipped underlayer: gradient, texture, spine — keeps rounded corners without clipping page UI */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900" />
            <div
              className="absolute inset-0 opacity-[0.04] mix-blend-multiply dark:opacity-[0.02] dark:mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
              }}
            />
            {currentPage > 0 && (
              <div className="absolute top-0 bottom-0 left-0 z-10 w-12 bg-gradient-to-r from-black/[0.06] to-transparent dark:from-black/[0.2]" />
            )}
          </div>

          {/* Page Content */}
          <div className="relative z-10 flex flex-1 flex-col">
            {currentPage === 0 ? (
              // Cover Page
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
                        className={`group/image relative w-full flex-1 overflow-hidden rounded-2xl transition-all ${isRegeneratingImage ? 'opacity-90' : ''}`}
                      >
                        <Image
                          src={imageUrl}
                          alt="Card cover"
                          fill
                          className="object-cover"
                          crossOrigin="anonymous"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {isRegeneratingImage ? (
                          <RegenerateShimmerOverlay
                            tone="cover"
                            className="z-20 rounded-2xl"
                          />
                        ) : null}

                        {/* Image regenerate button */}
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

                        {/* Image prompt input */}
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
                                    e.key === 'Enter' &&
                                    imagePromptText.trim()
                                  ) {
                                    void onRegenerateImage?.(
                                      imagePromptText.trim(),
                                    )
                                    setImagePromptText('')
                                    setShowImagePrompt(false)
                                  }
                                  if (e.key === 'Escape') {
                                    setShowImagePrompt(false)
                                    setImagePromptText('')
                                  }
                                }}
                                placeholder="Describe the image you want..."
                                className="min-w-0 flex-1 border-none bg-transparent px-2 py-1 text-sm text-foreground outline-none"
                                disabled={isRegeneratingImage}
                              />
                              <button
                                onClick={() => {
                                  if (imagePromptText.trim()) {
                                    void onRegenerateImage?.(
                                      imagePromptText.trim(),
                                    )
                                    setImagePromptText('')
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
                                  <Send className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowImagePrompt(false)
                                  setImagePromptText('')
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

                    {/* Headline overlay */}
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
            ) : isMessagePage ? (
              // Main message page: same stack as friends pages — crosshair layer, body copy, then contributions on top
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
                          showMainSpreadInnerBody ? 'anchored' : 'centered'
                        }
                      />
                    )}

                  {showMainSpreadInnerBody ? (
                    <div className="pointer-events-none relative z-10 flex min-h-[360px] flex-col justify-center *:pointer-events-auto">
                      <DraggableWrapper editable={editable}>
                        <div className="space-y-3">
                          <InlineEdit
                            ref={mainMessageInlineRef}
                            value={message}
                            onChange={onMessageChange}
                            editable={editable}
                            onRegenerate={onRegenerateMessage}
                            isRegenerating={isRegeneratingMessage}
                            regeneratePlacement={
                              onRegenerateMessage ? 'toolbar' : 'floating'
                            }
                            regenerateShimmerTone="paper"
                            className="min-h-[1.75em] leading-relaxed whitespace-pre-wrap text-foreground/90"
                            style={{ fontSize: `${messageFontSize}px` }}
                            placeholder="Write the message that appears inside your card…"
                          />

                          {editable && (
                            <div
                              className="flex flex-wrap items-center gap-6 pt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <label className="shrink-0 text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                                  Size
                                </label>
                                <input
                                  type="range"
                                  min={12}
                                  max={28}
                                  value={messageFontSize}
                                  onChange={(e) =>
                                    onMessageFontSizeChange?.(
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-border/50 accent-primary [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                                />
                              </div>
                              {totalPages > 2 && (
                                <div className="flex shrink-0 items-center gap-2">
                                  <label className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                                    Page
                                  </label>
                                  <select
                                    value={validMessagePage}
                                    onChange={(e) => {
                                      const newPage = Number(e.target.value)
                                      onMessagePageIndexChange?.(newPage)
                                      setCurrentPage(newPage)
                                    }}
                                    className="cursor-pointer rounded border border-border/50 bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground focus:outline-none"
                                  >
                                    {Array.from(
                                      { length: totalPages - 1 },
                                      (_, i) => i + 1,
                                    ).map((page) => (
                                      <option key={page} value={page}>
                                        {page}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {onRegenerateMessage ? (
                                <ToolbarRegenerateButton
                                  isRegenerating={isRegeneratingMessage}
                                  onOpen={() =>
                                    mainMessageInlineRef.current?.openRegeneratePrompt()
                                  }
                                />
                              ) : null}
                            </div>
                          )}
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
                        />
                      )}
                  </div>
                </div>
              </div>
            ) : (
              // Inner canvas pages: any number of contributions per page (`page_index`)
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
                      <ComposeCanvasEmptyHint variant="centered" />
                    )}

                  {/* Full-area layer like the message page: `relative` alone collapses when children are `position:absolute`, so drag clamp used height ~0 and locked Y. */}
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
                        />
                      )}
                  </div>

                  {!composeDraft &&
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

      {/* Navigation - Outside the card (hidden for cover-only preview) */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="h-10 w-10 p-0"
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
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              isLastPage && editable
                ? handleAddPage()
                : goToPage(currentPage + 1)
            }
            disabled={!canGoRight && !editable}
            className="h-10 w-10 p-0"
            title={isLastPage && editable ? 'Add a new page' : 'Next page'}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      ) : null}

      {/* Compose Actions - Outside the card */}
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
                'Save message'
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
