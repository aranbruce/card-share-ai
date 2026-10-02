import { Buffer } from "node:buffer"
import { generateText, type GeneratedFile, type ModelMessage } from "ai"
import { aiTelemetry } from "@/lib/ai-telemetry"
import { buildMultimodalUserMessage } from "@/lib/card-ai-prompt"
import { getCardCoverImageModel } from "@/lib/card-cover-image-model"
import { persistGeneratedCardImage } from "@/lib/persist-generated-card-image"

/** Fixed 4:5 framing for greeting-card covers. */
const CARD_COVER_ASPECT_RATIO = "4:5" as const

export type CardCoverArtContext = {
  /** Full user prompt text, assembled by the API route prompt module. */
  userScene: string
  /** Optional leading instruction when reference images are attached. */
  leadingText?: string
  source?: Uint8Array
  previous?: Uint8Array
  /** Funny photo template layout reference; `source` is then the person photo. */
  layout?: Uint8Array
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

function buildMultimodalMessages(ctx: CardCoverArtContext): ModelMessage[] {
  return buildMultimodalUserMessage(ctx.userScene, {
    previous: ctx.previous,
    attached: ctx.source,
    layout: ctx.layout,
    leadingText: ctx.leadingText,
  })
}

async function generateCardCoverViaGateway(
  model: string,
  ctx: CardCoverArtContext,
  distinctId?: string | null,
): Promise<GeneratedFile> {
  const { files } = await generateText({
    model,
    prompt: buildMultimodalMessages(ctx),
    providerOptions: {
      google: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: CARD_COVER_ASPECT_RATIO },
      },
    },
    ...aiTelemetry("generate-card-cover-art", distinctId),
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
  options?: { persist?: boolean; distinctId?: string | null },
): Promise<string> {
  const persist = options?.persist !== false
  const model = getCardCoverImageModel()

  const imageFile = await generateCardCoverViaGateway(
    model,
    ctx,
    options?.distinctId,
  )

  let imageUrl: string | null = null
  if (persist) {
    imageUrl = await persistGeneratedCardImage(imageFile)
  }
  if (!imageUrl) {
    imageUrl = generatedCoverImageToDataUrl(imageFile)
  }

  return imageUrl
}
