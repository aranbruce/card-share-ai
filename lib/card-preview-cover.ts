/** Covers bigger than this are skipped rather than loaded into the preview renderer. */
const MAX_COVER_BYTES = 10 * 1024 * 1024
const COVER_FETCH_TIMEOUT_MS = 5000

/** Image types the preview renderer (Satori) can draw. */
type PreviewImageType = "image/png" | "image/jpeg" | "image/gif"
const PREVIEW_IMAGE_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
]

/** Detects a drawable image type from its first bytes (headers can't be trusted). */
export function sniffPreviewImageType(
  bytes: Uint8Array,
): PreviewImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png"
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg"
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif"
  }
  return null
}

/**
 * Covers are only fetched from Supabase storage (where the app stores them), so a card's
 * image URL can't make the server request arbitrary addresses.
 */
export function isAllowedCoverUrl(
  url: string,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== "https:") return false
  if (parsed.hostname.endsWith(".supabase.co")) return true
  if (!supabaseUrl) return false
  try {
    return parsed.host === new URL(supabaseUrl).host
  } catch {
    return false
  }
}

function dataUrlType(url: string): string | null {
  const match = url.match(/^data:([^;,]+)[;,]/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * A card's cover as a data URL the preview renderer can draw, or null when there is none,
 * it can't be loaded, or it's in a format the renderer doesn't support (e.g. WebP).
 */
export async function loadPreviewCover(
  imageUrl: string | null | undefined,
): Promise<string | null> {
  const url = imageUrl?.trim()
  if (!url) return null

  if (url.startsWith("data:")) {
    const type = dataUrlType(url)
    if (!type || !PREVIEW_IMAGE_TYPES.includes(type)) return null
    // Base64 is about 4/3 the size of the bytes it holds.
    return url.length <= (MAX_COVER_BYTES * 4) / 3 ? url : null
  }

  if (!isAllowedCoverUrl(url)) return null

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!res.ok) return null
    const declared = Number(res.headers.get("content-length"))
    if (Number.isFinite(declared) && declared > MAX_COVER_BYTES) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength > MAX_COVER_BYTES) return null
    const type = sniffPreviewImageType(bytes)
    if (!type) return null
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`
  } catch {
    return null
  }
}
