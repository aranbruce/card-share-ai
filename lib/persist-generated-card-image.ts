import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"
import type { GeneratedFile } from "ai"

import { createServiceRoleClient } from "@/lib/supabase/admin"

const BUCKET = "card-images"

function extFromMediaType(mediaType: string): string {
  const base = mediaType.split(";")[0].trim().toLowerCase()
  if (base === "image/png") return "png"
  if (base === "image/jpeg" || base === "image/jpg") return "jpg"
  if (base === "image/webp") return "webp"
  if (base === "image/gif") return "gif"
  return "png"
}

function generatedBytes(file: GeneratedFile): Uint8Array {
  if (file.uint8Array instanceof Uint8Array) {
    return file.uint8Array
  }
  return Buffer.from(file.base64, "base64")
}

/**
 * Uploads the generated image to Supabase Storage and returns a public HTTPS URL.
 * Returns `null` if env or upload fails (caller may fall back to inline data URLs).
 */
export async function persistGeneratedCardImage(
  file: GeneratedFile,
): Promise<string | null> {
  const supabase = createServiceRoleClient()
  if (!supabase) return null

  const bytes = generatedBytes(file)
  const ext = extFromMediaType(file.mediaType)
  const path = `covers/${randomUUID()}.${ext}`
  const contentType = file.mediaType.split(";")[0].trim() || "image/png"

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  })

  if (error) {
    console.error("[persistGeneratedCardImage] upload failed:", error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
