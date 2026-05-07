import { Buffer } from "node:buffer"
import {
  MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH,
  MAX_SOURCE_IMAGE_BASE64_CHARS,
  MAX_SOURCE_IMAGE_BYTES,
} from "./source-image-limits"
import { fetchHttpsSourceImageBytes } from "./https-source-image"

/**
 * Resolves a user-supplied image URL to raw bytes safe to pass to a model.
 *
 * Accepts `data:image/*;base64,...` and allowlisted `https://` URLs only.
 * Returns null for anything invalid, oversized, or from a disallowed host —
 * callers should silently drop the image part rather than returning a 400,
 * since these routes degrade gracefully without image context.
 */
export async function resolveImageForModel(
  raw: string,
): Promise<Uint8Array | null> {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",")
    if (comma === -1) return null
    const meta = trimmed.slice(5, comma)
    if (!meta.toLowerCase().startsWith("image/")) return null
    if (!/;base64$/i.test(meta)) return null
    const b64 = trimmed.slice(comma + 1).replace(/\s/g, "")
    if (b64.length > MAX_SOURCE_IMAGE_BASE64_CHARS) return null
    const decoded = Buffer.from(b64, "base64")
    if (decoded.length === 0 || decoded.length > MAX_SOURCE_IMAGE_BYTES)
      return null
    return new Uint8Array(decoded)
  }

  if (trimmed.startsWith("https://")) {
    if (trimmed.length > MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH) return null
    const result = await fetchHttpsSourceImageBytes(trimmed)
    return result.ok ? result.bytes : null
  }

  return null
}
