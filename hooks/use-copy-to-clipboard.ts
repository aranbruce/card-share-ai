"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type CopySyncOptions,
  copyTextWithClipboardApi,
  tryCopyTextToClipboardSync,
} from "@/lib/copy-to-clipboard"

export const COPY_TO_CLIPBOARD_ERROR =
  "Could not copy. Check clipboard permissions, or select the link and copy manually."

export type CopyToClipboardOptions = CopySyncOptions & {
  onSuccess?: () => void
}

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const resetTimeoutRef = useRef<number | null>(null)
  const markCopiedRafRef = useRef<number | null>(null)

  const cancelMarkCopiedRaf = useCallback(() => {
    if (markCopiedRafRef.current !== null) {
      cancelAnimationFrame(markCopiedRafRef.current)
      markCopiedRafRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cancelMarkCopiedRaf()
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [cancelMarkCopiedRaf])

  const copy = useCallback((text: string, options?: CopyToClipboardOptions) => {
    const markCopied = () => {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current)
      }
      cancelMarkCopiedRaf()
      options?.onSuccess?.()
      markCopiedRafRef.current = requestAnimationFrame(() => {
        markCopiedRafRef.current = null
        setError("")
        setCopied(true)
        resetTimeoutRef.current = window.setTimeout(
          () => setCopied(false),
          2000,
        )
      })
    }

    const markFailed = () => {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current)
      }
      cancelMarkCopiedRaf()
      setCopied(false)
      setError(COPY_TO_CLIPBOARD_ERROR)
    }

    // Sync execCommand first (must stay in the user-gesture stack on iOS).
    if (
      tryCopyTextToClipboardSync(text, {
        scrollAnchor: options?.scrollAnchor,
        copyContainer: options?.copyContainer,
        input: options?.input,
      })
    ) {
      markCopied()
      return true
    }

    if (window.isSecureContext && navigator.clipboard) {
      void copyTextWithClipboardApi(text).then(markCopied).catch(markFailed)
      return true
    }

    markFailed()
    return false
  }, [cancelMarkCopiedRaf])

  const reset = useCallback(() => {
    cancelMarkCopiedRaf()
    if (resetTimeoutRef.current !== null) {
      clearTimeout(resetTimeoutRef.current)
    }
    setCopied(false)
    setError("")
  }, [cancelMarkCopiedRaf])

  return { copied, error, copy, reset }
}
