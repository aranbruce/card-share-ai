import { Buffer } from "node:buffer"
import { NextRequest, NextResponse } from "next/server"
import { generateImage } from "ai"

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
    const b64 = trimmed.slice(comma + 1)
    return { ok: true, input: Buffer.from(b64, "base64") }
  }

  return {
    ok: false,
    message:
      "Source image must be an https URL or a data:image/*;base64 data URL",
  }
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

    const { image } = await generateImage({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: source
        ? {
            images: [source],
            text: `${refinePrefix}${trimmedPrompt}`,
          }
        : trimmedPrompt,
      aspectRatio: "1:1",
    })

    if (!image?.base64 || !image.mediaType) {
      throw new Error("No image generated")
    }

    const imageUrl = `data:${image.mediaType};base64,${image.base64}`

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    )
  }
}
