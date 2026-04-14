import { Buffer } from "node:buffer"
import { NextRequest, NextResponse } from "next/server"
import { generateImage } from "ai"

/** Data URLs from the client are decoded to bytes; HTTPS stays a URL for the model to fetch. */
function sourceImageToModelInput(source: string): string | Uint8Array {
  const trimmed = source.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",")
    if (comma === -1) {
      throw new Error("Invalid data URL")
    }
    const meta = trimmed.slice(5, comma)
    if (!/;base64$/i.test(meta) && !/;base64;/i.test(meta)) {
      throw new Error("Source image data URL must be base64-encoded")
    }
    const b64 = trimmed.slice(comma + 1)
    return Buffer.from(b64, "base64")
  }
  return trimmed
}

export async function POST(request: NextRequest) {
  try {
    const { imagePrompt, sourceImageUrl } = (await request.json()) as {
      imagePrompt?: string
      sourceImageUrl?: string
    }

    if (!imagePrompt) {
      return NextResponse.json(
        { error: "Image prompt is required" },
        { status: 400 },
      )
    }

    const sourceRaw =
      typeof sourceImageUrl === "string" && sourceImageUrl.trim().length > 0
        ? sourceImageUrl.trim()
        : undefined

    const source = sourceRaw ? sourceImageToModelInput(sourceRaw) : undefined

    const refinePrefix =
      "Refine this greeting card cover image. Follow the instructions; keep layout and subject unless asked to change them.\n\n"

    const { image } = await generateImage({
      model: "google/gemini-3.1-flash-image-preview",
      prompt: source
        ? {
            images: [source],
            text: `${refinePrefix}${imagePrompt}`,
          }
        : imagePrompt,
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
