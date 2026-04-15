"use client"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
} from "react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
} from "react"
import { ArrowUp, Sparkles, X } from "lucide-react"
import { CANVAS_EDGE_PADDING } from "./draggable-wrapper"

export function RegenerateShimmerOverlay({
  tone,
  className,
}: {
  tone: "cover" | "paper"
  className?: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-sm",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0",
          tone === "cover"
            ? "ai-refine-shimmer-sweep-cover"
            : "ai-refine-shimmer-sweep-paper",
        )}
      />
    </div>
  )
}

export type InlineEditRegenerateHandle = {
  openRegeneratePrompt: () => void
  closeRegeneratePrompt: () => void
  submitRegenerateWithPrompt: (prompt: string) => Promise<void>
}

export type InlineEditProps = {
  value: string
  onChange?: (value: string) => void
  className?: string
  style?: CSSProperties
  editable?: boolean
  onRegenerate?: (prompt: string) => Promise<void>
  isRegenerating?: boolean
  /** Initial load / pending AI copy — shimmer only, no regenerate affordance. */
  isGenerating?: boolean
  /** Hint when the field is empty (editable mode). */
  placeholder?: string
  /** Muted placeholder on light pages; use e.g. `text-white/45` on the cover headline. */
  placeholderClassName?: string
  onFocusChange?: (focused: boolean) => void
  /**
   * `floating`: sparkle on the text edge (cover headline).
   * `toolbar`: hide sparkle; call `ref.openRegeneratePrompt()` from Size/Page toolbar.
   */
  regeneratePlacement?: "floating" | "toolbar"
  /** Fires when the “Describe the change” prompt opens or closes (toolbar placement). */
  onRegeneratePromptOpenChange?: (open: boolean) => void
  /**
   * When `regeneratePlacement` is `toolbar`, parent renders the prompt in `DraggableWrapper` footer
   * so it moves with the note; this wires the shared draft text.
   */
  toolbarRegeneratePrompt?: { value: string; onChange: (v: string) => void }
  /** Sweep style: bright on dark cover vs subtle on light message paper */
  regenerateShimmerTone?: "cover" | "paper"
  /** Start in edit mode and focus the field (e.g. right after click-to-place compose). */
  autoFocus?: boolean
}

// Inline edit component - uses contentEditable for truly identical sizing
export const InlineEdit = forwardRef<
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
    isGenerating = false,
    placeholder,
    placeholderClassName = "text-muted-foreground/45",
    onFocusChange,
    regeneratePlacement = "floating",
    regenerateShimmerTone = "cover",
    autoFocus = false,
    onRegeneratePromptOpenChange,
    toolbarRegeneratePrompt,
  },
  ref,
) {
  const [isEditing, setIsEditing] = useState(() => autoFocus)
  const [showPromptInput, setShowPromptInput] = useState(false)
  const [internalPrompt, setInternalPrompt] = useState("")
  const toolbarExternal =
    regeneratePlacement === "toolbar" && toolbarRegeneratePrompt != null
  const promptText = toolbarExternal
    ? toolbarRegeneratePrompt.value
    : internalPrompt
  const setPromptText = (s: string) => {
    if (toolbarExternal) toolbarRegeneratePrompt.onChange(s)
    else setInternalPrompt(s)
  }
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
    placeholder &&
      editable &&
      onChange &&
      !isEditing &&
      !value.trim() &&
      !isGenerating,
  )
  const showActivePlaceholder = Boolean(
    placeholder &&
      editable &&
      onChange &&
      isEditing &&
      editSurfaceEmpty &&
      !isGenerating,
  )

  const handleClick = (e: MouseEvent) => {
    if (isGenerating) return
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
      setEditSurfaceEmpty(!(editRef.current?.innerText || "").trim())
    })
  }, [isEditing])

  useEffect(() => {
    const syncEmptyFromValue = () => setEditSurfaceEmpty(!value.trim())
    if (isEditing) {
      syncEmptyFromValue()
      return
    }
    queueMicrotask(syncEmptyFromValue)
  }, [value, isEditing])

  useEffect(() => {
    onRegeneratePromptOpenChange?.(showPromptInput)
  }, [showPromptInput, onRegeneratePromptOpenChange])

  useEffect(() => {
    if (!showPromptInput || toolbarExternal) return

    const updatePosition = () => {
      if (!containerRef.current) return
      if (regeneratePlacement === "toolbar") {
        const canvas = containerRef.current.closest(
          "[data-card-canvas]",
        ) as HTMLElement | null
        if (canvas) {
          const cr = canvas.getBoundingClientRect()
          const ir = containerRef.current.getBoundingClientRect()
          setPromptPosition({
            top: ir.bottom + 12,
            left: cr.left + CANVAS_EDGE_PADDING,
            width: Math.max(0, cr.width - 2 * CANVAS_EDGE_PADDING),
          })
          return
        }
      }
      const rect = containerRef.current.getBoundingClientRect()
      setPromptPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 300),
      })
    }

    updatePosition()
    const focusT = setTimeout(() => {
      promptInputRef.current?.focus()
    }, 0)

    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      clearTimeout(focusT)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [showPromptInput, regeneratePlacement, toolbarExternal])

  const handleBlur = (e: FocusEvent) => {
    if (e.relatedTarget?.closest("[data-regenerate-area]")) {
      return
    }
    if (e.relatedTarget?.closest("[data-note-chrome]")) {
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
    setEditSurfaceEmpty(!(editRef.current.innerText || "").trim())
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (editRef.current) {
        editRef.current.innerText = value
        setEditSurfaceEmpty(!value.trim())
      }
      setIsEditing(false)
      setShowPromptInput(false)
      setPromptText("")
    }
  }

  const handleSparkleClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setPromptText("")
    setShowPromptInput(true)
  }

  const closeRegeneratePrompt = useCallback(() => {
    setShowPromptInput(false)
    setInternalPrompt("")
    toolbarRegeneratePrompt?.onChange("")
  }, [toolbarRegeneratePrompt])

  const runRegenerate = useCallback(
    async (raw: string) => {
      const p = raw.trim()
      if (!onRegenerate || !p) return
      await onRegenerate(p)
      closeRegeneratePrompt()
    },
    [onRegenerate, closeRegeneratePrompt],
  )

  useImperativeHandle(
    ref,
    () => ({
      openRegeneratePrompt: () => {
        if (!editable || !onRegenerate) return
        setInternalPrompt("")
        toolbarRegeneratePrompt?.onChange("")
        setShowPromptInput(true)
      },
      closeRegeneratePrompt,
      submitRegenerateWithPrompt: (raw: string) => runRegenerate(raw),
    }),
    [
      editable,
      onRegenerate,
      toolbarRegeneratePrompt,
      closeRegeneratePrompt,
      runRegenerate,
    ],
  )

  const handleRegenerate = async () => {
    await runRegenerate(promptText)
  }

  const handlePromptKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleRegenerate()
    }
    if (e.key === "Escape") {
      closeRegeneratePrompt()
    }
  }

  const showShimmer =
    isRegenerating || isGenerating

  const showFloatingRegenerate =
    editable &&
    onRegenerate &&
    !showPromptInput &&
    regeneratePlacement === "floating" &&
    !isGenerating

  /** Match typing metrics without applying message `color` to the hint overlay. */
  const placeholderMetricsStyle: CSSProperties | undefined = (() => {
    if (!style) return undefined
    const m: CSSProperties = {}
    if (style.fontSize != null) m.fontSize = style.fontSize
    if (style.lineHeight != null) m.lineHeight = style.lineHeight
    if (style.fontFamily != null) m.fontFamily = style.fontFamily
    if (style.letterSpacing != null) m.letterSpacing = style.letterSpacing
    return Object.keys(m).length ? m : undefined
  })()

  const editStyle: CSSProperties | undefined = (() => {
    if (!style) return undefined
    const base = { ...style } as CSSProperties & {
      "--refine-shimmer-base"?: string
    }
    if (
      showShimmer &&
      regenerateShimmerTone === "paper" &&
      style.color != null &&
      String(style.color).length > 0
    ) {
      base["--refine-shimmer-base"] = String(style.color)
    }
    return base
  })()

  return (
    <div
      ref={containerRef}
      className={cn("group relative", isGenerating && "pointer-events-none")}
      onMouseLeave={() => {
        if (!isEditing && !showPromptInput) {
          setShowPromptInput(false)
        }
      }}
    >
      <div className="relative w-full min-w-0">
        {/* Outside contentEditable so React does not fight the browser over children (insertBefore errors).
            Match `editRef` horizontal padding so the hint does not jump when switching to edit mode. */}
        {isEditing && showActivePlaceholder ? (
          <span
            className={cn(
              "pointer-events-none absolute inset-0 z-0 block w-full select-none",
              editable && onChange && "px-1",
              // Same box model & typography as `editRef` so the hint does not shift vs idle state.
              className,
              placeholderClassName,
            )}
            style={placeholderMetricsStyle}
            aria-hidden
          >
            {placeholder}
          </span>
        ) : null}
        <div
          ref={editRef}
          className={cn(
            "relative z-10 w-full min-w-0",
            className,
            editable && onChange && "rounded px-1",
            editable &&
              onChange &&
              !isEditing &&
              "cursor-text transition-colors hover:bg-primary/5",
            showShimmer &&
              regenerateShimmerTone === "cover" &&
              "ai-refine-shimmer-text-cover rounded-sm",
            showShimmer &&
              regenerateShimmerTone === "paper" &&
              "ai-refine-shimmer-text-paper rounded-sm",
            isEditing && "outline-none",
          )}
          style={editStyle ?? style}
          contentEditable={Boolean(
            editable && onChange && isEditing && !isGenerating,
          )}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={syncEditEmptyFromDom}
          onClick={(e) => {
            if (isEditing) e.stopPropagation()
            else handleClick(e)
          }}
        >
          {isEditing ? (
            value
          ) : showIdlePlaceholder ? (
            <span className={placeholderClassName}>{placeholder}</span>
          ) : (
            value
          )}
        </div>
      </div>

      {showFloatingRegenerate && (
        <button
          data-regenerate-area
          onClick={handleSparkleClick}
          disabled={isRegenerating}
          className="absolute top-1/2 right-0 z-10 -translate-y-1/2 rounded-full bg-primary p-2.5 text-primary-foreground opacity-100 shadow-lg transition-all hover:scale-110 hover:bg-primary/90 disabled:opacity-50 md:-right-12 md:opacity-0 md:group-hover:opacity-100"
          title="Rewrite with AI"
        >
          {isRegenerating ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </button>
      )}

      {showPromptInput && !toolbarExternal ? (
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
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder="Describe the change you want..."
              className="min-w-0 flex-1 border-none bg-transparent px-2 py-1 text-base text-foreground outline-none sm:text-sm"
              disabled={isRegenerating}
            />
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={isRegenerating || !promptText.trim()}
              className="rounded-full bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              title="Generate"
            >
              {isRegenerating ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={closeRegeneratePrompt}
              className="rounded-full p-1.5 transition-colors hover:bg-muted"
              title="Cancel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
})

export function ToolbarRegenerateButton({
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
