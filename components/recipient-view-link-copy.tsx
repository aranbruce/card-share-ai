"use client"

import { CopyLinkButton } from "@/components/copy-link-button"
import { Input } from "@/components/ui/input"
import { useRef } from "react"

interface RecipientViewLinkCopyProps {
  viewLink: string
  getViewLink: () => string
  onCopied?: () => void
}

/** Read-only view URL + copy button (shared by Direct Link and Ready to send). */
export function RecipientViewLinkCopy({
  viewLink,
  getViewLink,
  onCopied,
}: RecipientViewLinkCopyProps) {
  const copyContainerRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)

  if (!viewLink) return null

  return (
    <div ref={copyContainerRef} className="space-y-2">
      <Input
        ref={linkInputRef}
        value={viewLink}
        readOnly
        variant="readonly"
        aria-label="Recipient view link"
      />
      <CopyLinkButton
        getLink={getViewLink}
        copyContainerRef={copyContainerRef}
        linkInputRef={linkInputRef}
        label="Copy link"
        onCopied={onCopied}
      />
    </div>
  )
}
