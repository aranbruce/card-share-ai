import { Buffer } from "node:buffer"
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import type { GeneratedFile, ModelMessage } from "ai"
import {
  MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH,
  MAX_SOURCE_IMAGE_BASE64_CHARS,
  MAX_SOURCE_IMAGE_BYTES,
} from "@/lib/source-image-limits"

/** Nano Banana 2 — use `generateText`; image outputs are in `files`. */
const GEMINI_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview"

type SourceImageOk = { ok: true; input: string | Uint8Array }
type SourceImageErr = { ok: false; message: string }

/**
 * Only `https://` URLs (for the provider to fetch) or `data:image/*;base64,...`
 * (decoded here). Rejects http, other schemes, non-image data URLs, and bare strings.
 */
function parseSourceImageInput(source: string): SourceImageOk | SourceImageErr {
  const trimmed = source.trim()
  if (!trimmed) {
    return { ok: false, message: "Source image URL must not be empty" }
  }

  if (trimmed.startsWith("https://")) {
    if (trimmed.length > MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH) {
      return { ok: false, message: "Source image URL is too long" }
    }
    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol !== "https:") {
        return { ok: false, message: "Source image URL must use https" }
      }
      return { ok: true, input: trimmed }
    } catch {
      return { ok: false, message: "Invalid source image URL" }
    }
  }

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",")
    if (comma === -1) {
      return { ok: false, message: "Invalid data URL" }
    }
    const meta = trimmed.slice(5, comma)
    if (!meta.toLowerCase().startsWith("image/")) {
      return {
        ok: false,
        message: "Source image data URL must use an image/* media type",
      }
    }
    if (!/;base64$/i.test(meta) && !/;base64;/i.test(meta)) {
      return {
        ok: false,
        message: "Source image data URL must be base64-encoded",
      }
    }
    const b64 = trimmed.slice(comma + 1).replace(/\s/g, "")
    if (b64.length > MAX_SOURCE_IMAGE_BASE64_CHARS) {
      return {
        ok: false,
        message: "Source image data URL exceeds maximum size",
      }
    }
    const decoded = Buffer.from(b64, "base64")
    if (decoded.length === 0 || decoded.length > MAX_SOURCE_IMAGE_BYTES) {
      return {
        ok: false,
        message: "Source image data URL exceeds maximum size",
      }
    }
    return { ok: true, input: decoded }
  }

  return {
    ok: false,
    message:
      "Source image must be an https URL or a data:image/*;base64 data URL",
  }
}

/** Build a data URL from a generated image; prefer bytes so plain `{ uint8Array }` parts work. */
function generatedImageToDataUrl(file: GeneratedFile): string {
  const bytes =
    file.uint8Array instanceof Uint8Array
      ? file.uint8Array
      : Buffer.from(file.base64, "base64")
  return `data:${file.mediaType};base64,${Buffer.from(bytes).toString("base64")}`
}

export async function POST(request: NextRequest) {
  try {
    const { imagePrompt, sourceImageUrl } = (await request.json()) as {
      imagePrompt?: string
      sourceImageUrl?: string
    }

    const trimmedPrompt =
      typeof imagePrompt === "string" ? imagePrompt.trim() : ""

    if (!trimmedPrompt) {
      return NextResponse.json(
        { error: "Image prompt is required" },
        { status: 400 },
      )
    }

    const sourceRaw =
      typeof sourceImageUrl === "string" && sourceImageUrl.trim().length > 0
        ? sourceImageUrl.trim()
        : undefined

    let source: string | Uint8Array | undefined
    if (sourceRaw) {
      const parsed = parseSourceImageInput(sourceRaw)
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.message }, { status: 400 })
      }
      source = parsed.input
    }

    const refinePrefix =
      "Refine this greeting card cover image. Follow the instructions; keep layout and subject unless asked to change them.\n\n"

    const prompt: ModelMessage[] = [
      {
        role: "user",
        content: source
          ? [
              { type: "image", image: source },
              {
                type: "text",
                text: `${refinePrefix}${trimmedPrompt}`,
              },
            ]
          : trimmedPrompt,
      },
    ]

    const { files } = await generateText({
      model: GEMINI_IMAGE_MODEL,
      prompt,
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
    })

    const imageFile = files.find((f) => f.mediaType.startsWith("image/"))
    if (!imageFile) {
      throw new Error("No image generated")
    }

    const imageUrl = generatedImageToDataUrl(imageFile)

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    )
  }
}
