"use client"

import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"
import { CheckCircle2, Copy } from "lucide-react"
import { useId, type MouseEvent, type RefObject } from "react"

interface CopyLinkButtonProps {
  /** Build the URL at click time so origin is always current (required for iOS). */
  getLink: () => string
  /** Hidden copy target inside a modal (iOS focus trap). */
  copyContainerRef?: RefObject<HTMLElement | null>
  /** Visible URL field — last-resort copy target inside modals. */
  linkInputRef?: RefObject<HTMLInputElement | null>
  label?: string
  /** Screen-reader announcement on success; visible button text stays `label`. */
  copiedStatusLabel?: string
  onCopied?: () => void
  className?: string
}

export function CopyLinkButton({
  getLink,
  copyContainerRef,
  linkInputRef,
  label = "Copy link",
  copiedStatusLabel = "Link copied!",
  onCopied,
  className,
}: CopyLinkButtonProps) {
  const statusId = useId()
  const { copied, error, copy } = useCopyToClipboard()

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    copy(getLink(), {
      scrollAnchor: event.currentTarget,
      copyContainer: copyContainerRef?.current ?? undefined,
      input: linkInputRef?.current ?? undefined,
      onSuccess: onCopied,
    })
  }

  const statusMessage = copied ? copiedStatusLabel : error

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </p>
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={handleClick}
        aria-describedby={statusId}
        className="w-full"
      >
        {copied ? (
          <CheckCircle2 className="text-green-600" aria-hidden />
        ) : (
          <Copy aria-hidden />
        )}
        {label}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" aria-hidden="true">
          {error}
        </p>
      ) : null}
    </div>
  )
}
