const RATIO = /^\s*(\d+)\s*:\s*(\d+)\s*$/

/** Matches greeting-card cover framing in the product UI (see dashboard card tiles). */
export const DEFAULT_CARD_COVER_ASPECT_RATIO = "4:5" as const

const ALLOWED = new Set(["1:1", "4:3", "3:4", "4:5", "5:4", "16:9", "9:16"])

/** Aspect ratios @ai-sdk/fal maps without an explicit pixel `size`. */
const FAL_NATIVE_ASPECT = new Set([
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "16:10",
  "10:16",
  "21:9",
  "9:21",
])

export const CARD_COVER_ASPECT_RATIO_OPTIONS: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: "4:5", label: "Portrait (4:5) — card cover" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "9:16", label: "Tall (9:16)" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "16:9", label: "Wide (16:9)" },
]

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

/**
 * fal maps only a subset of aspect ratios; for others we pass an explicit `size`
 * so `generateImage` still honors the chosen ratio.
 */
export function sizingForGenerateImage(
  aspectRatio: `${number}:${number}`,
  useFal: boolean,
): { aspectRatio?: `${number}:${number}`; size?: `${number}x${number}` } {
  if (!useFal) {
    return { aspectRatio }
  }
  if (FAL_NATIVE_ASPECT.has(aspectRatio)) {
    return { aspectRatio }
  }
  const [wStr, hStr] = aspectRatio.split(":")
  const w = Number(wStr)
  const h = Number(hStr)
  const mult = 64
  const longEdge = 896
  if (w >= h) {
    const width = longEdge
    const height = Math.max(mult, Math.round((longEdge * h) / w / mult) * mult)
    return { size: `${width}x${height}` as `${number}x${number}` }
  }
  const height = longEdge
  const width = Math.max(mult, Math.round((longEdge * w) / h / mult) * mult)
  return { size: `${width}x${height}` as `${number}x${number}` }
}
