"use client"

import { useCallback, useEffect, useRef } from "react"

/**
 * Returns a stable `schedule` function that delays calling the provided `fn`
 * by `delayMs`. Calling `schedule` again before the timer fires cancels the
 * previous call — exactly one save fires per burst of rapid updates.
 */
export function useDebouncedSave(delayMs: number): (fn: () => void) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return useCallback(
    (fn: () => void) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(fn, delayMs)
    },
    [delayMs],
  )
}
