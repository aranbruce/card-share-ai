import { Buffer } from "node:buffer"
import { generateText, type GeneratedFile, type ModelMessage } from "ai"
import { coverArtInstructionBlock } from "@/lib/card-image-prompt"
import { DEFAULT_CARD_COVER_ASPECT_RATIO } from "@/lib/card-image-aspect"
import { getCardCoverImageModel } from "@/lib/card-cover-image-model"
import { persistGeneratedCardImage } from "@/lib/persist-generated-card-image"

export type CardCoverArtContext = {
  imagePrompt: string
  cardType: string
  customMessage: string
  coverHeadline: string
  source?: Uint8Array
  previous?: Uint8Array
}

function generatedCoverImageToDataUrl(file: GeneratedFile): string {
  const mediaType = file.mediaType.split(";")[0].trim() || "image/png"
  if (file.uint8Array instanceof Uint8Array) {
    return `data:${mediaType};base64,${Buffer.from(file.uint8Array).toString("base64")}`
  }
  if (typeof file.base64 === "string" && file.base64.length > 0) {
    return `data:${mediaType};base64,${file.base64}`
  }
  throw new Error("Generated image has no uint8Array or base64 payload")
}

function buildUserScene(ctx: CardCoverArtContext): string {
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
  return contextLines.length > 0
    ? `${constraints}\n\n${contextLines.join("\n")}`
    : constraints
}

type ImagePart = { type: "image"; image: string | Uint8Array }
type TextPart = { type: "text"; text: string }

function buildMultimodalMessages(
  ctx: CardCoverArtContext,
  userScene: string,
): ModelMessage[] {
  const previous = ctx.previous
  const source = ctx.source

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

  return [{ role: "user", content }]
}

async function generateCardCoverViaGateway(
  model: string,
  ctx: CardCoverArtContext,
  userScene: string,
): Promise<GeneratedFile> {
  const { files } = await generateText({
    model,
    prompt: buildMultimodalMessages(ctx, userScene),
    providerOptions: {
      google: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: DEFAULT_CARD_COVER_ASPECT_RATIO },
      },
    },
  })

  const imageFile = files.find((f) => f.mediaType.startsWith("image/"))
  if (!imageFile) {
    throw new Error("No image generated")
  }
  return imageFile
}

/**
 * Generates a greeting card cover with optional reference images (4:5 via gateway Gemini).
 */
export async function generateCardCoverArt(
  ctx: CardCoverArtContext,
  options?: { persist?: boolean },
): Promise<{ imageUrl: string; imageFile: GeneratedFile }> {
  const persist = options?.persist !== false
  const userScene = buildUserScene(ctx)
  const model = getCardCoverImageModel()

  const imageFile = await generateCardCoverViaGateway(model, ctx, userScene)

  let imageUrl: string | null = null
  if (persist) {
    imageUrl = await persistGeneratedCardImage(imageFile)
  }
  if (!imageUrl) {
    imageUrl = generatedCoverImageToDataUrl(imageFile)
  }

  return { imageUrl, imageFile }
}
