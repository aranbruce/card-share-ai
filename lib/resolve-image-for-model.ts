import { Buffer } from "node:buffer"
import {
  MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH,
  MAX_SOURCE_IMAGE_BASE64_CHARS,
  MAX_SOURCE_IMAGE_BYTES,
} from "./source-image-limits"
import { fetchHttpsSourceImageBytes } from "./https-source-image"

export type SourceImageResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; message: string }

/**
 * Validates and resolves a user-supplied image source to raw bytes.
 *
 * Accepts `data:image/*;base64,...` and allowlisted `https://` URLs only.
 * Returns a structured error for anything invalid, oversized, or disallowed
 * so callers that need a 400 response can surface the message.
 */
export async function resolveSourceImage(
  raw: string,
): Promise<SourceImageResult> {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, message: "Source image must not be empty" }

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",")
    if (comma === -1) return { ok: false, message: "Invalid data URL" }
    const meta = trimmed.slice(5, comma)
    if (!meta.toLowerCase().startsWith("image/"))
      return {
        ok: false,
        message: "Source image data URL must use an image/* media type",
      }
    if (!/;base64$/i.test(meta) && !/;base64;/i.test(meta))
      return {
        ok: false,
        message: "Source image data URL must be base64-encoded",
      }
    const b64 = trimmed.slice(comma + 1).replace(/\s/g, "")
    if (b64.length > MAX_SOURCE_IMAGE_BASE64_CHARS)
      return {
        ok: false,
        message: "Source image data URL exceeds maximum size",
      }
    const decoded = Buffer.from(b64, "base64")
    if (decoded.length === 0 || decoded.length > MAX_SOURCE_IMAGE_BYTES)
      return {
        ok: false,
        message: "Source image data URL exceeds maximum size",
      }
    return { ok: true, bytes: new Uint8Array(decoded) }
  }

  if (trimmed.startsWith("https://")) {
    if (trimmed.length > MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH)
      return { ok: false, message: "Source image URL is too long" }
    return fetchHttpsSourceImageBytes(trimmed)
  }

  return {
    ok: false,
    message:
      "Source image must be an https URL or a data:image/*;base64 data URL",
  }
}

/**
 * Resolves a user-supplied image URL to raw bytes safe to pass to a model.
 * Returns null for anything invalid — callers degrade gracefully without image context.
 */
export async function resolveImageForModel(
  raw: string,
): Promise<Uint8Array | null> {
  const result = await resolveSourceImage(raw)
  return result.ok ? result.bytes : null
}
