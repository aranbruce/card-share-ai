"use client"

import { type ReactNode, useState } from "react"
import Image from "next/image"
import { Sparkles, ImagePlus, X, RotateCcw, RotateCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MESSAGE_TEXT_COLOR_PRESETS } from "@/lib/message-text-color-presets"
import {
  activeMessageFontPresetId,
  getMessageFontFamily,
  MESSAGE_FONT_PRESETS,
  type MessageFontPresetId,
} from "@/lib/message-font-presets"

const FONT_SIZE_PRESETS = [
  { px: 12, label: "Tiny" },
  { px: 14, label: "Small" },
  { px: 16, label: "Medium" },
  { px: 20, label: "Large" },
  { px: 24, label: "Huge" },
] as const

type NotePanelLoadingProps = {
  loading: true
}

type NotePanelReadyProps = {
  loading?: false | undefined
  title: string
  values: {
    textColor?: string | null
    giphyUrl?: string | null
    fontSize?: number | null
    fontFamily?: string | null
    rotationDegrees?: number | null
    pageIndex?: number | null
  }
  isRegenerating: boolean
  onRegenerate: (prompt: string) => Promise<void>
  onTextColorChange: (color: string) => void
  onFontFamilyChange: (id: MessageFontPresetId) => void
  onFontSizeChange: (px: number) => void
  onRotationChange: (degrees: number) => void
  onPageChange: (pageNum: number) => void
  onOpenGifPicker: () => void
  onGifChange: (url: string | null) => void
  totalInnerPages: number
  error?: string | null
  footer?: ReactNode
}

export type NotePanelProps = NotePanelLoadingProps | NotePanelReadyProps

export function NotePanel(props: NotePanelProps) {
  const [refineOpen, setRefineOpen] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState("")

  if (props.loading) {
    return (
      <aside className="flex flex-col border-t border-border bg-muted/20 md:fixed md:top-14 md:right-0 md:h-[calc(100dvh-56px)] md:w-[320px] md:border-t-0 md:border-l lg:w-[420px]">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 md:p-7">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded-sm" />
            <Skeleton className="h-7 w-40 rounded-md" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-16 rounded-full" />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <div className="h-px bg-border" />
            <Skeleton className="h-3 w-12 rounded-sm" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </aside>
    )
  }

  const {
    title,
    values,
    isRegenerating,
    onRegenerate,
    onTextColorChange,
    onFontFamilyChange,
    onFontSizeChange,
    onRotationChange,
    onPageChange,
    onOpenGifPicker,
    onGifChange,
    totalInnerPages,
    error,
    footer,
  } = props

  const rotation = values.rotationDegrees ?? 0
  const activeFontPresetId = activeMessageFontPresetId(values.fontFamily)

  return (
    <aside className="flex flex-col border-t border-border bg-muted/20 md:fixed md:top-14 md:right-0 md:h-[calc(100dvh-56px)] md:w-[320px] md:border-t-0 md:border-l lg:w-[420px]">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 md:p-7">
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
            Your note
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
            {title}
          </h2>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* AI refine */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Refine with AI
          </p>
          <div className="flex h-7 flex-wrap items-center gap-2">
            {refineOpen ? (
              <div className="relative w-full">
                <Input
                  autoFocus
                  className="rounded-full pr-9 focus-visible:ring-1"
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
                  aria-label="Close refine panel"
                  className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
                  onClick={() => setRefineOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <ChipButton
                  onClick={() => setRefineOpen(true)}
                  disabled={isRegenerating}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  Improve
                </ChipButton>
                <ChipButton
                  onClick={() => void onRegenerate("Make this message shorter")}
                  disabled={isRegenerating}
                  className="text-xs"
                >
                  Shorten
                </ChipButton>
                <ChipButton
                  onClick={() =>
                    void onRegenerate(
                      "Make this message warmer and more personal",
                    )
                  }
                  disabled={isRegenerating}
                  className="text-xs"
                >
                  Warmer
                </ChipButton>
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
                className="h-7 w-7 cursor-pointer rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color,
                  borderColor:
                    values.textColor === color
                      ? "hsl(var(--brand))"
                      : "transparent",
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

        {/* Font */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Font</p>
          <div className="flex flex-wrap gap-1.5">
            {MESSAGE_FONT_PRESETS.map(({ id, label }) => (
              <ChipButton
                key={id}
                onClick={() => onFontFamilyChange(id)}
                active={activeFontPresetId === id}
                className="py-1 text-xs"
                style={{
                  fontFamily: getMessageFontFamily(id),
                }}
              >
                {label}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* GIF */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            GIF{" "}
            <span className="font-normal text-muted-foreground/60">
              (optional)
            </span>
          </p>
          {values.giphyUrl ? (
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-border">
                <Image
                  src={values.giphyUrl}
                  alt="Attached GIF"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 text-muted-foreground"
                  onClick={onOpenGifPicker}
                >
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 text-destructive/70 hover:text-destructive"
                  onClick={() => onGifChange(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <ChipButton
              onClick={onOpenGifPicker}
              className="self-start text-xs"
            >
              <ImagePlus className="h-3 w-3" />
              Add GIF
            </ChipButton>
          )}
        </div>

        {/* Text size */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Text size</p>
          <div className="flex flex-wrap gap-1.5">
            {FONT_SIZE_PRESETS.map(({ px, label }) => (
              <ChipButton
                key={px}
                onClick={() => onFontSizeChange(px)}
                active={(values.fontSize ?? 16) === px}
                className="py-1 text-xs"
              >
                {label}
              </ChipButton>
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
              className="flex h-full cursor-pointer items-center justify-center rounded-l-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
              className="flex h-full cursor-pointer items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
              {Array.from({ length: totalInnerPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <ChipButton
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    active={(values.pageIndex ?? 1) === pageNum}
                    className="py-1 text-xs"
                  >
                    {pageNum}
                  </ChipButton>
                ),
              )}
            </div>
          </div>
        )}

        {footer}
      </div>
    </aside>
  )
}
