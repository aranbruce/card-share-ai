"use client"

import { useSyncExternalStore } from "react"

/** e.g. "Fri 10 Oct, 09:00" in the viewer's locale and time zone. */
export function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

const subscribe = () => () => {}

/**
 * A time in the viewer's own time zone. The server doesn't know it, so this renders empty
 * there and fills in on the client, which also avoids a hydration mismatch.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatLocalDateTime(iso),
    () => null,
  )
  return <time dateTime={iso}>{text}</time>
}
