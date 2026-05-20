import { Buffer } from "node:buffer"
import { generateImage, type GeneratedFile } from "ai"
import { coverArtInstructionBlock } from "@/lib/card-image-prompt"
import {
  DEFAULT_CARD_COVER_ASPECT_RATIO,
  parseAspectRatio,
  sizingForGenerateImage,
} from "@/lib/card-image-aspect"
import { resolveCardCoverImageModel } from "@/lib/card-cover-image-model"
import { persistGeneratedCardImage } from "@/lib/persist-generated-card-image"

export type CardCoverArtContext = {
  imagePrompt: string
  cardType: string
  customMessage: string
  coverHeadline: string
  source?: Uint8Array
  previous?: Uint8Array
}

/** Build a data URL from a generated image; prefer bytes so plain `{ uint8Array }` parts work. */
export function generatedCoverImageToDataUrl(file: GeneratedFile): string {
  const mediaType = file.mediaType.split(";")[0].trim() || "image/png"
  if (file.uint8Array instanceof Uint8Array) {
    return `data:${mediaType};base64,${Buffer.from(file.uint8Array).toString("base64")}`
  }
  if (typeof file.base64 === "string" && file.base64.length > 0) {
    return `data:${mediaType};base64,${file.base64}`
  }
  throw new Error("Generated image has no uint8Array or base64 payload")
}

/**
 * Generates a greeting card cover via `generateImage` (Vercel AI SDK) with optional
 * reference images and a fixed aspect ratio.
 */
export async function generateCardCoverArt(
  ctx: CardCoverArtContext,
  aspectRatioRaw?: string | undefined,
  options?: { persist?: boolean },
): Promise<{ imageUrl: string; imageFile: GeneratedFile }> {
  const persist = options?.persist !== false

  const aspectRatio =
    parseAspectRatio(aspectRatioRaw) ?? DEFAULT_CARD_COVER_ASPECT_RATIO

  const trimmedPrompt = ctx.imagePrompt.trim()
  const trimmedCardType = ctx.cardType.trim()
  const trimmedCustomMessage = ctx.customMessage.trim()

  const headline = ctx.coverHeadline.trim()
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

  const previous = ctx.previous
  const source = ctx.source

  let prompt: Parameters<typeof generateImage>[0]["prompt"]
  let inputImageCount = 0

  if (previous && source) {
    inputImageCount = 2
    prompt = {
      text: `Existing card cover image (refine the first image). Attached reference image (second image; use its style, mood, and subject as inspiration).

Refine the existing card cover using the attached image as inspiration. Follow the instructions; keep layout and subject unless asked to change them.

${userScene}`,
      images: [previous, source],
    }
  } else if (previous) {
    inputImageCount = 1
    prompt = {
      text: `Existing card cover image (refine this).

Refine this existing card cover image. Follow the instructions; keep layout and subject unless asked to change them.

${userScene}`,
      images: [previous],
    }
  } else if (source) {
    inputImageCount = 1
    prompt = {
      text: `Attached reference image (use its style, mood, and subject as inspiration to generate a new card cover).

Generate a new greeting card cover inspired by the attached image.

${userScene}`,
      images: [source],
    }
  } else {
    prompt = userScene
  }

  const { model, providerOptions, useFal } =
    resolveCardCoverImageModel(inputImageCount)
  const sizeParams = sizingForGenerateImage(aspectRatio, useFal)

  const { image: imageFile } = await generateImage({
    model,
    prompt,
    ...sizeParams,
    ...(providerOptions ? { providerOptions } : {}),
  })

  if (!imageFile) {
    throw new Error("No image generated")
  }

  let imageUrl: string | null = null
  if (persist) {
    imageUrl = await persistGeneratedCardImage(imageFile)
  }
  if (!imageUrl) {
    imageUrl = generatedCoverImageToDataUrl(imageFile)
  }

  return { imageUrl, imageFile }
}
