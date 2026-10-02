import { after, NextRequest, NextResponse } from "next/server"
import { flushPostHogAiSpans } from "@/lib/posthog-ai-flush"
import { generateCardCoverArt } from "@/lib/generate-card-cover-art"
import { getTemplateLayout, getTemplateScene } from "@/lib/card-template-scenes"
import {
  buildCardCoverArtContext,
  buildTemplateCoverArtContext,
} from "@/lib/generate-card-image"
import { getDistinctIdFromRequest } from "@/lib/posthog-distinct-id-from-request"
import { resolveSourceImage } from "@/lib/resolve-image-for-model"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"

export async function POST(request: NextRequest) {
  const rate = checkFixedWindowRateLimit(request, {
    namespace: "api:generate-image",
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
    const body = (await request.json()) as {
      userPrompt?: string
      attachedImageUrl?: string
      existingCardCoverImageUrl?: string
      coverHeadline?: string
      cardType?: string
      recipientName?: string
      tone?: string
      userContext?: string
      templateId?: string
      posthogDistinctId?: unknown
    }
    const {
      userPrompt,
      attachedImageUrl,
      existingCardCoverImageUrl,
      coverHeadline,
      cardType,
      recipientName,
      tone,
      userContext,
      templateId,
    } = body
    const distinctId = getDistinctIdFromRequest(request, body)

    const trimmedPrompt =
      typeof userPrompt === "string" ? userPrompt.trim() : ""
    const trimmedCardType = typeof cardType === "string" ? cardType.trim() : ""
    const resolvedTone = typeof tone === "string" ? tone.trim() : ""
    const resolvedContext =
      typeof userContext === "string" ? userContext.trim() : ""

    const sourceRaw =
      typeof attachedImageUrl === "string" && attachedImageUrl.trim().length > 0
        ? attachedImageUrl.trim()
        : undefined

    const previousRaw =
      typeof existingCardCoverImageUrl === "string" &&
      existingCardCoverImageUrl.trim().length > 0
        ? existingCardCoverImageUrl.trim()
        : undefined

    const headline =
      typeof coverHeadline === "string" ? coverHeadline.trim() : ""

    const hasAnyContext =
      trimmedPrompt ||
      trimmedCardType ||
      resolvedTone ||
      resolvedContext ||
      headline ||
      sourceRaw ||
      previousRaw
    if (!hasAnyContext) {
      return NextResponse.json(
        {
          error:
            "At least one of cardType, tone, userContext, coverHeadline, userPrompt, attachedImageUrl, or existingCardCoverImageUrl is required",
        },
        { status: 400, headers: rate.headers },
      )
    }

    const scene =
      typeof templateId === "string" && templateId
        ? getTemplateScene(templateId)
        : undefined
    if (templateId && !scene) {
      return NextResponse.json(
        { error: "Unknown template" },
        { status: 400, headers: rate.headers },
      )
    }
    if (scene && !sourceRaw) {
      return NextResponse.json(
        { error: "Add a photo to use this template" },
        { status: 400, headers: rate.headers },
      )
    }

    const [sourceResult, previousResult, layout] = await Promise.all([
      sourceRaw ? resolveSourceImage(sourceRaw) : Promise.resolve(null),
      previousRaw ? resolveSourceImage(previousRaw) : Promise.resolve(null),
      scene && templateId ? getTemplateLayout(templateId) : undefined,
    ])

    if (sourceResult && !sourceResult.ok) {
      return NextResponse.json(
        { error: sourceResult.message },
        { status: 400, headers: rate.headers },
      )
    }

    if (previousResult && !previousResult.ok) {
      return NextResponse.json(
        { error: previousResult.message },
        { status: 400, headers: rate.headers },
      )
    }

    const source: Uint8Array | undefined = sourceResult?.ok
      ? sourceResult.bytes
      : undefined
    const previous: Uint8Array | undefined = previousResult?.ok
      ? previousResult.bytes
      : undefined

    const ctx =
      scene && source
        ? buildTemplateCoverArtContext(scene, source, layout)
        : buildCardCoverArtContext({
            cardType: trimmedCardType,
            recipientName:
              typeof recipientName === "string"
                ? recipientName.trim()
                : undefined,
            tone: resolvedTone,
            userContext: resolvedContext,
            userPrompt: trimmedPrompt,
            coverHeadline: headline,
            source,
            previous,
          })

    // Registered before the call so spans are flushed on success and failure.
    after(flushPostHogAiSpans)
    const imageUrl = await generateCardCoverArt(ctx, {
      persist: true,
      distinctId,
    })

    return NextResponse.json({ imageUrl }, { headers: rate.headers })
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500, headers: rate.headers },
    )
  }
}
