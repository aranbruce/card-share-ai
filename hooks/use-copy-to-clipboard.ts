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

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback((text: string, options?: CopyToClipboardOptions) => {
    const markCopied = () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
      requestAnimationFrame(() => {
        setError("")
        setCopied(true)
        resetTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
        options?.onSuccess?.()
      })
    }

    const markFailed = () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
      setCopied(false)
      setError(COPY_TO_CLIPBOARD_ERROR)
    }

    const runExecCopy = () => {
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
      } else {
        markFailed()
      }
      return false
    }

    if (window.isSecureContext && navigator.clipboard) {
      void navigator.clipboard
        .writeText(text)
        .then(markCopied)
        .catch(runExecCopy)
      return true
    }

    return runExecCopy()
  }, [])

  const reset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
    }
    setCopied(false)
    setError("")
  }, [])

  return { copied, error, copy, reset }
}
