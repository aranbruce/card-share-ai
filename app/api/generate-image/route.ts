import { NextRequest, NextResponse } from "next/server"
import { generateCardCoverArt } from "@/lib/generate-card-cover-art"
import { parseAspectRatio } from "@/lib/card-image-aspect"
import { resolveSourceImage } from "@/lib/resolve-image-for-model"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"

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
      aspectRatio: aspectRatioRaw,
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
      /** Optional `width:height` (e.g. `4:5`). Invalid values return 400. */
      aspectRatio?: string
    }

    if (
      aspectRatioRaw !== undefined &&
      aspectRatioRaw !== null &&
      String(aspectRatioRaw).trim() !== "" &&
      parseAspectRatio(aspectRatioRaw) === undefined
    ) {
      return NextResponse.json(
        {
          error: "Invalid aspectRatio (use width:height from the allowed set)",
        },
        { status: 400, headers: rate.headers },
      )
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

    const { imageUrl } = await generateCardCoverArt(
      {
        imagePrompt: trimmedPrompt,
        cardType: trimmedCardType,
        customMessage: trimmedCustomMessage,
        coverHeadline: headline,
        source,
        previous,
      },
      typeof aspectRatioRaw === "string" ? aspectRatioRaw : undefined,
      { persist: true },
    )

    return NextResponse.json({ imageUrl }, { headers: rate.headers })
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500, headers: rate.headers },
    )
  }
}
