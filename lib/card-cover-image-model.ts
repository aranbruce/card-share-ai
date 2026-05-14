import { createFal } from "@ai-sdk/fal"

const DEFAULT_GATEWAY_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview"

type FalImageModel = ReturnType<ReturnType<typeof createFal>["image"]>
type GenerateImageParams = Parameters<
  typeof import("ai").generateImage
>[0]

function falApiKey(): string | undefined {
  const k = process.env.FAL_API_KEY?.trim() || process.env.FAL_KEY?.trim()
  return k || undefined
}

export type ResolvedCardCoverImageModel = {
  /** Model passed to `generateImage` — gateway id string or a fal image model. */
  model: string | FalImageModel
  providerOptions?: GenerateImageParams["providerOptions"]
  /** When true, use `sizingForGenerateImage(..., true)` for pixel sizes fal does not map. */
  useFal: boolean
}

/**
 * Picks the image backend for card covers.
 *
 * - Default: AI Gateway string model (`AI_IMAGE_GATEWAY_MODEL` or Gemini flash image preview).
 * - `AI_IMAGE_PROVIDER=fal` with `FAL_KEY` or `FAL_API_KEY`: fal.ai via @ai-sdk/fal.
 * - Two input images on fal require `AI_IMAGE_FAL_MODEL_MULTI` (e.g. a model that accepts
 *   `image_urls`); otherwise fal is skipped and the gateway model is used for that request.
 */
export function resolveCardCoverImageModel(
  inputImageCount: number,
): ResolvedCardCoverImageModel {
  const provider =
    process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase() ?? "gateway"
  const gatewayModel =
    process.env.AI_IMAGE_GATEWAY_MODEL?.trim() || DEFAULT_GATEWAY_IMAGE_MODEL

  const key = falApiKey()
  const useFal = provider === "fal" && Boolean(key)

  if (!useFal) {
    return { model: gatewayModel, useFal: false }
  }

  const fal = createFal({ apiKey: key })

  if (inputImageCount >= 2) {
    const multiId = process.env.AI_IMAGE_FAL_MODEL_MULTI?.trim()
    if (!multiId) {
      return { model: gatewayModel, useFal: false }
    }
    return {
      model: fal.image(multiId),
      providerOptions: { fal: { useMultipleImages: true } },
      useFal: true,
    }
  }

  const singleId =
    process.env.AI_IMAGE_FAL_MODEL?.trim() || "fal-ai/flux-pro/kontext"
  return {
    model: fal.image(singleId),
    useFal: true,
  }
}
