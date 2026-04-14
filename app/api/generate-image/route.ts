import { NextRequest, NextResponse } from "next/server"
import { generateImage } from "ai"

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

    const source =
      typeof sourceImageUrl === "string" && sourceImageUrl.trim().length > 0
        ? sourceImageUrl.trim()
        : undefined

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
