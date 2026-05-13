import { generateText } from "ai"
import { persistGeneratedCardImage } from "@/lib/persist-generated-card-image"
import { coverArtInstructionBlock } from "@/lib/card-image-prompt"

const GEMINI_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview"

export async function generateCardCoverImage(params: {
  cardType?: string
  coverHeadline?: string
  customMessage?: string
}): Promise<string> {
  const { cardType, coverHeadline, customMessage } = params

  const constraints = coverArtInstructionBlock(coverHeadline)
  const contextLines: string[] = []
  if (cardType) contextLines.push(`Card type: ${cardType}`)
  if (customMessage) contextLines.push(`Additional context: ${customMessage}`)
  const userScene =
    contextLines.length > 0
      ? `${constraints}\n\n${contextLines.join("\n")}`
      : constraints

  const { files } = await generateText({
    model: GEMINI_IMAGE_MODEL,
    prompt: [{ role: "user", content: userScene }],
    providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
  })

  const imageFile = files.find((f) => f.mediaType.startsWith("image/"))
  if (!imageFile) return ""

  const persisted = await persistGeneratedCardImage(imageFile)
  return persisted ?? ""
}
