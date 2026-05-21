"use client"

import type { Card3DComposeDraftProps } from "./types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GiphyCanvasGif } from "./giphy-canvas-gif"
import { useRef } from "react"
import { DraggableWrapper } from "./draggable-wrapper"
import { InlineEdit, type InlineEditRegenerateHandle } from "./inline-edit"
import { getMessageFontFamily } from "@/lib/message-font-presets"

export function ComposeCanvasEmptyHint({
  variant,
}: {
  variant: "anchored" | "centered"
}) {
  return (
    <div
      className={
        variant === "centered"
          ? "pointer-events-none absolute inset-0 z-1 flex items-center justify-center px-8"
          : "pointer-events-none absolute right-0 bottom-5 left-0 z-1 flex justify-center px-6"
      }
      aria-hidden
    >
      <p className="max-w-60 text-center text-[11px] leading-snug font-medium text-muted-foreground/50 dark:text-muted-foreground/45">
        Click anywhere to place a note
      </p>
    </div>
  )
}

export function ComposeDraftEditor({
  composeDraft,
  messageFontSize,
  composeError,
  onComposeDraftChange,
  onComposeDraftRegenerateMessage,
  composeDraftRegenerating,
  onFocusChange,
}: {
  composeDraft: NonNullable<Card3DComposeDraftProps["composeDraft"]>
  messageFontSize: number
  composeError: string | null
  onComposeDraftChange: NonNullable<
    Card3DComposeDraftProps["onComposeDraftChange"]
  >
  onComposeDraftRegenerateMessage?: Card3DComposeDraftProps["onComposeDraftRegenerateMessage"]
  composeDraftRegenerating: boolean
  onFocusChange?: (focused: boolean) => void
}) {
  const messageInlineRef = useRef<InlineEditRegenerateHandle | null>(null)

  return (
    <div
      className="absolute inset-0 z-20"
      onFocus={() => {
        onFocusChange?.(true)
      }}
    >
      <DraggableWrapper
        key={`compose-draft-p${composeDraft.pageIndex}`}
        editable
        initialOffset={{
          x: composeDraft.x,
          y: composeDraft.y,
        }}
        initialWidthPercent={composeDraft.widthPercent ?? 75}
        rotationDegrees={composeDraft.rotationDegrees ?? 0}
        onLayoutCommit={(layout) =>
          onComposeDraftChange({
            x: layout.x,
            y: layout.y,
            widthPercent: layout.widthPercent,
          })
        }
        onFocusLeave={() => {
          messageInlineRef.current?.closeRegeneratePrompt()
          onFocusChange?.(false)
        }}
      >
        <div className="space-y-3">
          {composeError ? (
            <Alert variant="destructive">
              <AlertDescription>{composeError}</AlertDescription>
            </Alert>
          ) : null}
          {composeDraft.giphyUrl ? (
            <div className="flex w-full justify-center overflow-hidden rounded-md">
              <GiphyCanvasGif src={composeDraft.giphyUrl} alt="Attached GIF" />
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
            regenerateShimmerTone="paper"
            className="min-h-[1.5em] leading-relaxed whitespace-pre-wrap text-foreground/90"
            style={{
              fontSize: `${composeDraft.fontSize ?? messageFontSize}px`,
              ...(composeDraft.textColor
                ? { color: composeDraft.textColor }
                : {}),
              ...(getMessageFontFamily(composeDraft.fontFamily)
                ? { fontFamily: getMessageFontFamily(composeDraft.fontFamily) }
                : {}),
            }}
            placeholder="Write your note…"
          />
        </div>
      </DraggableWrapper>
    </div>
  )
}
