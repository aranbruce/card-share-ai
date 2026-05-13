import { Buffer } from "node:buffer"
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import type { GeneratedFile, ModelMessage } from "ai"
import { persistGeneratedCardImage } from "@/lib/persist-generated-card-image"
import { resolveSourceImage } from "@/lib/resolve-image-for-model"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { coverArtInstructionBlock } from "@/lib/card-image-prompt"

/** Nano Banana 2 — use `generateText`; image outputs are in `files`. */
const GEMINI_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview"

/** Build a data URL from a generated image; prefer bytes so plain `{ uint8Array }` parts work. */
function generatedImageToDataUrl(file: GeneratedFile): string {
  const bytes =
    file.uint8Array instanceof Uint8Array
      ? file.uint8Array
      : Buffer.from(file.base64, "base64")
  return `data:${file.mediaType};base64,${Buffer.from(bytes).toString("base64")}`
}

export async function POST(request: NextRequest) {
  const rate = checkFixedWindowRateLimit(request, {
    namespace: "api-generate-image",
    maxRequests: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rate.headers },
    )
  }
  try {
    const {
      imagePrompt,
      attachedImageUrl,
      existingCardCoverImageUrl,
      coverHeadline,
      cardType,
      customMessage,
    } = (await request.json()) as {
      imagePrompt?: string
      /** User-uploaded style/subject reference image. */
      attachedImageUrl?: string
      /** Existing card cover image to refine. */
      existingCardCoverImageUrl?: string
      /** Current card headline — guides mood/theme; must not appear as text in the image. */
      coverHeadline?: string
      cardType?: string
      customMessage?: string
    }

    const trimmedPrompt =
      typeof imagePrompt === "string" ? imagePrompt.trim() : ""
    const trimmedCardType = typeof cardType === "string" ? cardType.trim() : ""
    const trimmedCustomMessage =
      typeof customMessage === "string" ? customMessage.trim() : ""

    const sourceRaw =
      typeof attachedImageUrl === "string" && attachedImageUrl.trim().length > 0
        ? attachedImageUrl.trim()
        : undefined

    const previousRaw =
      typeof existingCardCoverImageUrl === "string" &&
      existingCardCoverImageUrl.trim().length > 0
        ? existingCardCoverImageUrl.trim()
        : undefined

    const hasAnyContext =
      trimmedPrompt ||
      trimmedCardType ||
      trimmedCustomMessage ||
      sourceRaw ||
      previousRaw
    if (!hasAnyContext) {
      return NextResponse.json(
        {
          error:
            "At least one of cardType, imagePrompt, customMessage, attachedImageUrl, or existingCardCoverImageUrl is required",
        },
        { status: 400, headers: rate.headers },
      )
    }

    const [sourceResult, previousResult] = await Promise.all([
      sourceRaw ? resolveSourceImage(sourceRaw) : Promise.resolve(null),
      previousRaw ? resolveSourceImage(previousRaw) : Promise.resolve(null),
    ])

    if (sourceResult && !sourceResult.ok) {
      return NextResponse.json(
        { error: sourceResult.message },
        { status: 400, headers: rate.headers },
      )
    }

    const source: Uint8Array | undefined = sourceResult?.ok
      ? sourceResult.bytes
      : undefined
    // Soft-fail: if the existing cover can't be resolved, proceed without it
    const previous: Uint8Array | undefined = previousResult?.ok
      ? previousResult.bytes
      : undefined

    const headline =
      typeof coverHeadline === "string" ? coverHeadline.trim() : ""
    const constraints = coverArtInstructionBlock(
      headline.length > 0 ? headline : undefined,
    )
    const contextLines: string[] = []
    if (trimmedCardType) contextLines.push(`Card type: ${trimmedCardType}`)
    if (trimmedCustomMessage)
      contextLines.push(`Additional context: ${trimmedCustomMessage}`)
    if (trimmedPrompt) contextLines.push(trimmedPrompt)
    const userScene =
      contextLines.length > 0
        ? `${constraints}\n\n${contextLines.join("\n")}`
        : constraints

    type ImagePart = { type: "image"; image: string | Uint8Array }
    type TextPart = { type: "text"; text: string }

    let content: string | Array<ImagePart | TextPart>

    if (previous && source) {
      content = [
        { type: "text", text: "Existing card cover image (refine this):" },
        { type: "image", image: previous },
        {
          type: "text",
          text: "Attached reference image (use its style, mood, and subject as inspiration):",
        },
        { type: "image", image: source },
        {
          type: "text",
          text: `Refine the existing card cover using the attached image as inspiration. Follow the instructions; keep layout and subject unless asked to change them.\n\n${userScene}`,
        },
      ]
    } else if (previous) {
      content = [
        { type: "text", text: "Existing card cover image (refine this):" },
        { type: "image", image: previous },
        {
          type: "text",
          text: `Refine this existing card cover image. Follow the instructions; keep layout and subject unless asked to change them.\n\n${userScene}`,
        },
      ]
    } else if (source) {
      content = [
        {
          type: "text",
          text: "Attached reference image (use its style, mood, and subject as inspiration to generate a new card cover):",
        },
        { type: "image", image: source },
        {
          type: "text",
          text: `Generate a new greeting card cover inspired by the attached image.\n\n${userScene}`,
        },
      ]
    } else {
      content = userScene
    }

    const prompt: ModelMessage[] = [{ role: "user", content }]

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

    const persisted = await persistGeneratedCardImage(imageFile)
    const imageUrl = persisted ?? generatedImageToDataUrl(imageFile)

    return NextResponse.json({ imageUrl }, { headers: rate.headers })
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500, headers: rate.headers },
    )
  }
}
