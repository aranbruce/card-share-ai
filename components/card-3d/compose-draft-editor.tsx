"use client"

import type { Card3DProps } from "./types"
import { useEffect, useRef, useState } from "react"
import { DraggableWrapper } from "./draggable-wrapper"
import {
  InlineEdit,
  ToolbarRegenerateButton,
  type InlineEditRegenerateHandle,
} from "./inline-edit"
import {
  MessageFormattingToolbar,
  snapMessageFontSize,
} from "./message-formatting-toolbar"
import { RegeneratePromptBar } from "./regenerate-prompt-bar"

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
  totalPages,
  onSelectInnerPage,
}: {
  composeDraft: NonNullable<Card3DProps["composeDraft"]>
  messageFontSize: number
  composeError: string | null
  onComposeDraftChange: NonNullable<Card3DProps["onComposeDraftChange"]>
  onComposeDraftRegenerateMessage?: Card3DProps["onComposeDraftRegenerateMessage"]
  composeDraftRegenerating: boolean
  totalPages: number
  onSelectInnerPage: (pageIndex: number) => void
}) {
  /** Matches dashed outline + footer toolbar: active while the note is “selected” on the canvas. */
  const [isFocused, setIsFocused] = useState(true)
  const [composeRegeneratePromptOpen, setComposeRegeneratePromptOpen] =
    useState(false)
  const [composeRegeneratePromptText, setComposeRegeneratePromptText] =
    useState("")
  const messageInlineRef = useRef<InlineEditRegenerateHandle | null>(null)
  const draggableRef = useRef<HTMLDivElement | null>(null)
  const isFocusedRef = useRef(true)

  useEffect(() => {
    isFocusedRef.current = isFocused
  }, [isFocused])

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      const el = draggableRef.current
      if (!el) return
      const target = e.target
      if (!(target instanceof Node)) return
      if (el.contains(target)) {
        if (!isFocusedRef.current) setIsFocused(true)
        return
      }
      if (!isFocusedRef.current) return
      setIsFocused(false)
      messageInlineRef.current?.closeRegeneratePrompt()
    }
    document.addEventListener("pointerdown", onPointerDownCapture, true)
    return () =>
      document.removeEventListener("pointerdown", onPointerDownCapture, true)
  }, [])

  return (
    <div className="absolute inset-0 z-20">
      <DraggableWrapper
        ref={draggableRef}
        editable
        isActive={isFocused}
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
        footer={
          isFocused ? (
            composeRegeneratePromptOpen && onComposeDraftRegenerateMessage ? (
              <div data-compose-format-toolbar data-regenerate-area>
                <RegeneratePromptBar
                  className="w-full max-w-none"
                  value={composeRegeneratePromptText}
                  onValueChange={setComposeRegeneratePromptText}
                  isRegenerating={composeDraftRegenerating}
                  onSubmit={() =>
                    void messageInlineRef.current?.submitRegenerateWithPrompt(
                      composeRegeneratePromptText,
                    )
                  }
                  onCancel={() =>
                    messageInlineRef.current?.closeRegeneratePrompt()
                  }
                />
              </div>
            ) : (
              <div data-compose-format-toolbar>
                <MessageFormattingToolbar
                  className="flex w-full max-w-none"
                  fontSize={composeDraft.fontSize ?? messageFontSize}
                  onFontSizeChange={(px) =>
                    onComposeDraftChange({ fontSize: px })
                  }
                  textColor={composeDraft.textColor ?? null}
                  onTextColorChange={(hex) =>
                    onComposeDraftChange({ textColor: hex })
                  }
                  rotationDegrees={composeDraft.rotationDegrees ?? null}
                  onRotationDegreesChange={(deg) =>
                    onComposeDraftChange({ rotationDegrees: deg })
                  }
                  showPage={totalPages > 1}
                  pageValue={composeDraft.pageIndex}
                  onPageChange={onSelectInnerPage}
                  totalPages={totalPages}
                  aiTweakSlot={
                    onComposeDraftRegenerateMessage ? (
                      <ToolbarRegenerateButton
                        isRegenerating={composeDraftRegenerating}
                        onOpen={() =>
                          messageInlineRef.current?.openRegeneratePrompt()
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
              onComposeDraftRegenerateMessage ? "toolbar" : "floating"
            }
            regenerateShimmerTone="paper"
            onRegeneratePromptOpenChange={(open) => {
              setComposeRegeneratePromptOpen(open)
              if (!open) setComposeRegeneratePromptText("")
            }}
            toolbarRegeneratePrompt={
              onComposeDraftRegenerateMessage
                ? {
                    value: composeRegeneratePromptText,
                    onChange: setComposeRegeneratePromptText,
                  }
                : undefined
            }
            className="min-h-[1.5em] leading-relaxed whitespace-pre-wrap text-foreground/90"
            style={{
              fontSize: `${snapMessageFontSize(composeDraft.fontSize ?? messageFontSize)}px`,
              ...(composeDraft.textColor
                ? { color: composeDraft.textColor }
                : {}),
            }}
            placeholder="Write your note…"
          />
        </div>
      </DraggableWrapper>
    </div>
  )
}
