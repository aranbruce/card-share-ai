/** Multimodal Gemini image models use `generateText` on the gateway, not `generateImage`. */
export const DEFAULT_CARD_COVER_IMAGE_MODEL =
  "google/gemini-3.1-flash-image-preview"

/** Gateway string models that return images via `generateText` + `result.files`. */
export function isGatewayMultimodalImageModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase()
  return id.includes("gemini") && id.includes("image")
}

/**
 * Card cover model via Vercel AI Gateway (`AI_IMAGE_GATEWAY_MODEL` or Gemini flash image preview).
 */
export function getCardCoverImageModel(): string {
  return process.env.AI_IMAGE_GATEWAY_MODEL?.trim() || DEFAULT_CARD_COVER_IMAGE_MODEL
}
