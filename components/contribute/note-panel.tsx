"use client"

import { useState } from "react"
import Image from "next/image"
import { Sparkles, ImagePlus, X, ArrowUp, RotateCcw, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MESSAGE_TEXT_COLOR_PRESETS } from "@/lib/message-text-color-presets"

const FONT_SIZE_PRESETS = [
  { px: 12, label: "Tiny" },
  { px: 14, label: "Small" },
  { px: 16, label: "Medium" },
  { px: 20, label: "Large" },
  { px: 24, label: "Huge" },
] as const

export type NotePanelProps = {
  title: string
  values: {
    textColor?: string | null
    giphyUrl?: string | null
    fontSize?: number | null
    rotationDegrees?: number | null
    pageIndex?: number | null
  }
  isRegenerating: boolean
  onRegenerate: (prompt: string) => Promise<void>
  onTextColorChange: (color: string) => void
  onFontSizeChange: (px: number) => void
  onRotationChange: (degrees: number) => void
  onPageChange: (pageNum: number) => void
  onOpenGifPicker: () => void
  onGifChange: (url: string | null) => void
  totalInnerPages: number
  error?: string | null
  onSubmit?: () => void
  onCancel?: () => void
  submitting?: boolean
}

export function NotePanel({
  title,
  values,
  isRegenerating,
  onRegenerate,
  onTextColorChange,
  onFontSizeChange,
  onRotationChange,
  onPageChange,
  onOpenGifPicker,
  onGifChange,
  totalInnerPages,
  error,
  onSubmit,
  onCancel,
  submitting = false,
}: NotePanelProps) {
  const [refineOpen, setRefineOpen] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState("")

  const rotation = values.rotationDegrees ?? 0

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
      <div>
        <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
          Your note
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
          {title}
        </h2>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* AI refine */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Refine with AI</p>
        <div className="flex flex-wrap gap-2">
          {refineOpen ? (
            <div className="flex w-full gap-2">
              <input
                autoFocus
                className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Describe the change…"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && refinePrompt.trim()) {
                    void onRegenerate(refinePrompt)
                    setRefinePrompt("")
                    setRefineOpen(false)
                  }
                  if (e.key === "Escape") setRefineOpen(false)
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={() => setRefineOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setRefineOpen(true)}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                Improve
              </button>
              <button
                onClick={() => void onRegenerate("Make this message shorter")}
                disabled={isRegenerating}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
              >
                Shorten
              </button>
              <button
                onClick={() => void onRegenerate("Make this message warmer and more personal")}
                disabled={isRegenerating}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-50"
              >
                Warmer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Ink color */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Ink color</p>
        <div className="flex flex-wrap gap-2">
          {MESSAGE_TEXT_COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => onTextColorChange(color)}
              className="h-7 w-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor:
                  values.textColor === color ? "hsl(var(--brand))" : "transparent",
                boxShadow:
                  values.textColor === color
                    ? "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--brand))"
                    : undefined,
              }}
              aria-label={`Color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* GIF */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          GIF{" "}
          <span className="font-normal text-muted-foreground/60">(optional)</span>
        </p>
        {values.giphyUrl ? (
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-border">
              <Image src={values.giphyUrl} alt="Attached GIF" fill className="object-cover" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onOpenGifPicker}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Change
              </button>
              <button
                onClick={() => onGifChange(null)}
                className="text-xs text-destructive/70 transition-colors hover:text-destructive"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenGifPicker}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Add GIF
          </button>
        )}
      </div>

      {/* Text size */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Text size</p>
        <div className="flex flex-wrap gap-1.5">
          {FONT_SIZE_PRESETS.map(({ px, label }) => (
            <button
              key={px}
              onClick={() => onFontSizeChange(px)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (values.fontSize ?? 16) === px
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Rotation</p>
        <div className="inline-flex h-9 w-fit items-center rounded-xl border border-border bg-background">
          <button
            type="button"
            disabled={rotation <= -12}
            onClick={() => onRotationChange(Math.max(-12, rotation - 1))}
            className="flex h-full items-center justify-center rounded-l-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            title="Rotate counter-clockwise"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="min-w-12 text-center font-mono text-xs text-foreground">
            {rotation}°
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            type="button"
            disabled={rotation >= 12}
            onClick={() => onRotationChange(Math.min(12, rotation + 1))}
            className="flex h-full items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            title="Rotate clockwise"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Page selector */}
      {totalInnerPages > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Page</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: totalInnerPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  (values.pageIndex ?? 1) === pageNum
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                ].join(" ")}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit / cancel — compose mode only */}
      {onSubmit && onCancel && (
        <div className="mt-auto flex gap-3 pt-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand text-white hover:bg-brand/90"
            onClick={() => void onSubmit()}
            disabled={submitting || isRegenerating}
          >
            {submitting ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <ArrowUp className="mr-2 h-4 w-4" />
            )}
            Add my note
          </Button>
        </div>
      )}
    </div>
  )
}
