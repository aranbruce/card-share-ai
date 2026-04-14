/** Max decoded image size for refine/source uploads (server + client guard). */
export const MAX_SOURCE_IMAGE_BYTES = 5 * 1024 * 1024

/** Max base64 payload length in a `data:` URL before decode (~4/3 expansion + padding). */
export const MAX_SOURCE_IMAGE_BASE64_CHARS =
  Math.ceil((MAX_SOURCE_IMAGE_BYTES * 4) / 3) + 8

/** Reasonable cap on user-supplied HTTPS URLs passed to the image provider. */
export const MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH = 2048

/** True when the string is a `data:` URL (leading/trailing whitespace ignored). */
export function looksLikeDataUrl(url: string): boolean {
  return url.trim().startsWith("data:")
}

export function isDataUrlSourceImageTooLargeForRequest(url: string): boolean {
  const t = url.trim()
  if (!t.startsWith("data:")) return false
  const comma = t.indexOf(",")
  if (comma === -1) return true
  const b64 = t.slice(comma + 1).replace(/\s/g, "")
  if (b64.length === 0) return true
  return b64.length > MAX_SOURCE_IMAGE_BASE64_CHARS
}

/** Omits oversized `data:` sources so refine still runs (text-only) without huge JSON bodies. */
export function sourceImageUrlForRefineRequest(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined
  const t = url.trim()
  if (!t) return undefined
  if (isDataUrlSourceImageTooLargeForRequest(t)) {
    return undefined
  }
  return t
}
