export const DEFAULT_CARD_COVER_IMAGE_MODEL =
  "google/gemini-3.1-flash-image-preview"

/**
 * Card cover model via Vercel AI Gateway (`AI_IMAGE_GATEWAY_MODEL` or Gemini flash image preview).
 */
export function getCardCoverImageModel(): string {
  return (
    process.env.AI_IMAGE_GATEWAY_MODEL?.trim() || DEFAULT_CARD_COVER_IMAGE_MODEL
  )
}
