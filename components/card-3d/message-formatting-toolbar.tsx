"use client"

import { cn } from "@/lib/utils"
import {
  MAX_CONTRIBUTION_ROTATION_DEGREES,
  MIN_CONTRIBUTION_ROTATION_DEGREES,
} from "@/lib/contribution-rotation"
import { Layers, Palette, RotateCw, Type } from "lucide-react"
import type { ReactNode } from "react"

/** Discrete text sizes for inner messages (card canvas / compose). */
const MESSAGE_FONT_SIZE_PRESETS = [12, 14, 16, 20, 24] as const

const MESSAGE_FONT_SIZE_LABEL: Record<
  (typeof MESSAGE_FONT_SIZE_PRESETS)[number],
  string
> = {
  12: "Extra small",
  14: "Small",
  16: "Normal",
  20: "Large",
  24: "Extra large",
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
  return (
    <div
      role="toolbar"
      aria-label="Text size, color, page, and refine"
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
        {onRotationDegreesChange ? (
          <span className="flex items-center gap-1.5">
            <RotateCw
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <label className="sr-only">Text rotation</label>
            <select
              className={cn(messageFormatSelectClassName, "max-w-[7.5rem]")}
              value={snappedRotation}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => onRotationDegreesChange(Number(e.target.value))}
            >
              {Array.from(
                {
                  length:
                    MAX_CONTRIBUTION_ROTATION_DEGREES -
                    MIN_CONTRIBUTION_ROTATION_DEGREES +
                    1,
                },
                (_, i) => MIN_CONTRIBUTION_ROTATION_DEGREES + i,
              ).map((deg) => (
                <option key={deg} value={deg}>
                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                </option>
              ))}
            </select>
          </span>
        ) : null}
        {showPage ? (
          <span className="flex items-center gap-1.5">
            <Layers
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <label className="sr-only">Page</label>
            <select
              className={cn(messageFormatSelectClassName, "max-w-[8rem]")}
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
