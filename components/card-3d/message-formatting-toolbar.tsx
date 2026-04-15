"use client"

import { cn } from "@/lib/utils"
import {
  MAX_CONTRIBUTION_ROTATION_DEGREES,
  MIN_CONTRIBUTION_ROTATION_DEGREES,
} from "@/lib/contribution-rotation"
import { Image as ImageIcon, Layers, Palette, RotateCcw, RotateCw, Type } from "lucide-react"
import { useMemo, type ReactNode } from "react"

/** Discrete text sizes for inner messages (card canvas / compose). */
const MESSAGE_FONT_SIZE_PRESETS = [12, 14, 16, 20, 24] as const

const MESSAGE_FONT_SIZE_LABEL: Record<
  (typeof MESSAGE_FONT_SIZE_PRESETS)[number],
  string
> = {
  12: "Tiny",
  14: "Small",
  16: "Base",
  20: "Large",
  24: "Huge",
}

export function snapMessageFontSize(px: number) {
  type Preset = (typeof MESSAGE_FONT_SIZE_PRESETS)[number]
  let best: Preset = MESSAGE_FONT_SIZE_PRESETS[0]
  let bestDist = Infinity
  for (const p of MESSAGE_FONT_SIZE_PRESETS) {
    const d = Math.abs(p - px)
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  }
  return best
}

/** Shown when `text_color` is unset (theme handles actual foreground). */
export const DEFAULT_MESSAGE_TEXT_COLOR_HEX = "#171717"
export const DEFAULT_MESSAGE_ROTATION_DEGREES = 0

export function snapMessageRotationDegrees(deg: number) {
  const bounded = Math.max(
    MIN_CONTRIBUTION_ROTATION_DEGREES,
    Math.min(MAX_CONTRIBUTION_ROTATION_DEGREES, deg),
  )
  return Math.round(bounded)
}

const messageFormatSelectClassName =
  "max-w-[9rem] cursor-pointer rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"

export function MessageFormattingToolbar({
  fontSize,
  onFontSizeChange,
  textColor,
  onTextColorChange,
  hasGif = false,
  onGifClick,
  onGifClear,
  rotationDegrees = DEFAULT_MESSAGE_ROTATION_DEGREES,
  onRotationDegreesChange,
  showPage,
  pageValue,
  onPageChange,
  totalPages,
  aiTweakSlot,
  className,
}: {
  fontSize: number
  onFontSizeChange: (px: number) => void
  textColor?: string | null
  onTextColorChange?: (hex: string | null) => void
  hasGif?: boolean
  onGifClick?: () => void
  onGifClear?: () => void
  rotationDegrees?: number | null
  onRotationDegreesChange?: (deg: number) => void
  showPage: boolean
  pageValue: number
  onPageChange: (pageIndex: number) => void
  totalPages: number
  aiTweakSlot?: ReactNode
  className?: string
}) {
  const snapped = snapMessageFontSize(fontSize)
  const colorInputValue = textColor ?? DEFAULT_MESSAGE_TEXT_COLOR_HEX
  const snappedRotation = snapMessageRotationDegrees(
    rotationDegrees ?? DEFAULT_MESSAGE_ROTATION_DEGREES,
  )
  const toolbarAriaLabel = useMemo(() => {
    const parts: string[] = ["Text size"]
    if (onGifClick) parts.push("gif")
    if (onTextColorChange) parts.push("color")
    if (onRotationDegreesChange) parts.push("rotation")
    if (showPage) parts.push("page")
    if (aiTweakSlot) parts.push("refine")
    return parts.join(", ")
  }, [onGifClick, onTextColorChange, onRotationDegreesChange, showPage, aiTweakSlot])

  return (
    <div
      role="toolbar"
      aria-label={toolbarAriaLabel}
      className={cn(
        "inline-flex max-w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-border/60 bg-background/95 px-2.5 py-1.5 shadow-md backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5">
          <Type
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <label className="sr-only">Text size</label>
          <select
            className={messageFormatSelectClassName}
            value={snapped}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
          >
            {MESSAGE_FONT_SIZE_PRESETS.map((px) => (
              <option key={px} value={px}>
                {MESSAGE_FONT_SIZE_LABEL[px]}
              </option>
            ))}
          </select>
        </span>
        {onTextColorChange ? (
          <span className="flex items-center gap-1.5">
            <Palette
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <label className="sr-only">Text color</label>
            <input
              type="color"
              className="h-7 w-7 min-w-0 cursor-pointer appearance-none rounded border border-border/60 bg-background p-0.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&::-moz-color-swatch]:rounded-[3px] [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
              value={colorInputValue}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => onTextColorChange(e.target.value)}
              title="Text color"
            />
          </span>
        ) : null}
        {onGifClick ? (
          <span className="flex items-center gap-1.5">
            <ImageIcon
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <button
              type="button"
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs shadow-sm hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onGifClick()
              }}
              title={hasGif ? "Change GIF" : "Add GIF"}
            >
              {hasGif ? "Change GIF" : "Add GIF"}
            </button>
            {hasGif && onGifClear ? (
              <button
                type="button"
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm hover:bg-muted/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onGifClear()
                }}
                title="Remove GIF"
              >
                Remove
              </button>
            ) : null}
          </span>
        ) : null}
        {onRotationDegreesChange ? (
          <div
            className="flex h-7 items-center rounded-md border border-border/60 bg-background shadow-sm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex h-full items-center justify-center rounded-l-md px-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
              disabled={snappedRotation <= MIN_CONTRIBUTION_ROTATION_DEGREES}
              onClick={(e) => {
                e.stopPropagation()
                onRotationDegreesChange(
                  Math.max(
                    MIN_CONTRIBUTION_ROTATION_DEGREES,
                    snappedRotation - 1,
                  ),
                )
              }}
              title="Rotate counter-clockwise"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Rotate counter-clockwise</span>
            </button>
            <div className="h-4 w-[1px] bg-border/60" aria-hidden />
            <button
              type="button"
              className="flex h-full items-center justify-center rounded-r-md px-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
              disabled={snappedRotation >= MAX_CONTRIBUTION_ROTATION_DEGREES}
              onClick={(e) => {
                e.stopPropagation()
                onRotationDegreesChange(
                  Math.min(
                    MAX_CONTRIBUTION_ROTATION_DEGREES,
                    snappedRotation + 1,
                  ),
                )
              }}
              title="Rotate clockwise"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Rotate clockwise</span>
            </button>
          </div>
        ) : null}
        {showPage ? (
          <span className="flex items-center gap-1.5">
            <Layers
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <label className="sr-only">Page</label>
            <select
              className={cn(messageFormatSelectClassName, "max-w-32")}
              value={pageValue}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation()
                onPageChange(Number(e.target.value))
              }}
            >
              {Array.from({ length: totalPages - 1 }, (_, i) => i + 1).map(
                (page) => (
                  <option key={page} value={page}>
                    Page {page}
                  </option>
                ),
              )}
            </select>
          </span>
        ) : null}
      </div>
      {aiTweakSlot ? (
        <span className="flex shrink-0 items-center">{aiTweakSlot}</span>
      ) : null}
    </div>
  )
}
