import { generateCardCoverArt } from "@/lib/generate-card-cover-art"

export async function generateCardCoverImage(params: {
  cardType?: string
  coverHeadline?: string
  customMessage?: string
  /** Optional `width:height` (e.g. `4:5`); defaults in `generateCardCoverArt`. */
  aspectRatio?: string
}): Promise<string> {
  const {
    cardType = "",
    coverHeadline = "",
    customMessage = "",
    aspectRatio,
  } = params

  const { imageUrl } = await generateCardCoverArt(
    {
      imagePrompt: "",
      cardType,
      customMessage,
      coverHeadline: coverHeadline || "",
    },
    aspectRatio,
    { persist: true },
  )

  if (!imageUrl.startsWith("http")) {
    throw new Error("Image generated but could not be persisted")
  }

  return imageUrl
}
