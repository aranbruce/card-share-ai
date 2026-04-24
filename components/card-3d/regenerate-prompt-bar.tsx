"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowUp, X } from "lucide-react"
import type { KeyboardEvent } from "react"

export function RegeneratePromptBar({
  value,
  onValueChange,
  onSubmit,
  onCancel,
  isRegenerating,
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  onSubmit: () => void | Promise<void>
  onCancel: () => void
  isRegenerating?: boolean
  className?: string
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void onSubmit()
    }
    if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <div
      data-regenerate-area
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex w-full max-w-none items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-xl">
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the change you want…"
          className="min-w-0 flex-1 border-none bg-transparent px-2 py-1 text-base text-foreground outline-none sm:text-sm"
          disabled={isRegenerating}
          autoFocus
        />
        <Button
          variant="primary"
          size="icon-sm"
          onClick={() => void onSubmit()}
          disabled={isRegenerating || !value.trim()}
          className="rounded-full"
          title="Generate"
        >
          {isRegenerating ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          className="rounded-full"
          title="Cancel"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}
