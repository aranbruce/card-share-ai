const RATIO = /^\s*(\d+)\s*:\s*(\d+)\s*$/

/** Default cover framing for generated images (server-side). */
export const DEFAULT_CARD_COVER_ASPECT_RATIO = "4:5" as const

/** Single source of truth for API `aspectRatio` validation. */
export const ALLOWED_ASPECT_RATIOS = [
  "4:5",
  "3:4",
  "9:16",
  "1:1",
  "5:4",
  "4:3",
  "16:9",
] as const

const ALLOWED = new Set<string>(ALLOWED_ASPECT_RATIOS)

/**
 * Validates `width:height` from user/API input against an allowlist.
 */
export function parseAspectRatio(
  raw: unknown,
): `${number}:${number}` | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== "string") return undefined
  const m = raw.trim().match(RATIO)
  if (!m) return undefined
  const key = `${Number(m[1])}:${Number(m[2])}`
  if (!ALLOWED.has(key)) return undefined
  return key as `${number}:${number}`
}
