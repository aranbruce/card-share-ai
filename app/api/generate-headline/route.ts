import { generateCardHeadline } from "@/lib/generate-card-headline"
import { getDistinctIdFromRequest } from "@/lib/posthog-distinct-id-from-request"
import { resolveCardAiImages } from "@/lib/resolve-card-ai-images"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { NextRequest, NextResponse } from "next/server"

/**
 * TEMPORARY, for comparing headline models on preview deployments only.
 * Remove before merging.
 */
const EVAL_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-opus-5.5",
  "openai/gpt-5.6-terra",
  "google/gemini-3.8-flash",
]

export async function POST(request: NextRequest) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:generate-headline",
    maxRequests: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimit.headers },
    )
  }

  try {
    const body = (await request.json()) as {
      cardType?: string
      recipientName?: string
      tone?: string
      userContext?: string
      userPrompt?: string
      cardTitle?: string
      attachedImageUrl?: string
      existingCardCoverImageUrl?: string
      posthogDistinctId?: unknown
      evalModels?: unknown
    }

    const cardType =
      typeof body.cardType === "string" ? body.cardType.trim() : ""
    const recipientName =
      typeof body.recipientName === "string" ? body.recipientName.trim() : ""
    const distinctId = getDistinctIdFromRequest(request, body)

    if (!cardType || !recipientName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    const { attached, previous } = await resolveCardAiImages(body)

    const params = {
      cardType,
      recipientName,
      tone: typeof body.tone === "string" ? body.tone.trim() : undefined,
      userContext:
        typeof body.userContext === "string"
          ? body.userContext.trim()
          : undefined,
      userPrompt:
        typeof body.userPrompt === "string"
          ? body.userPrompt.trim()
          : undefined,
      cardTitle:
        typeof body.cardTitle === "string" ? body.cardTitle.trim() : undefined,
      attached,
      previous,
    }

    const evalModels =
      process.env.VERCEL_ENV === "preview" && Array.isArray(body.evalModels)
        ? body.evalModels.filter(
            (m): m is string =>
              typeof m === "string" && EVAL_MODELS.includes(m),
          )
        : []
    if (evalModels.length > 0) {
      const results = await Promise.all(
        evalModels.map((model) =>
          generateCardHeadline(params, { distinctId, model }).catch(
            (e: unknown) =>
              `ERROR ${e instanceof Error ? e.message : String(e)}`,
          ),
        ),
      )
      return NextResponse.json(
        {
          evalResults: Object.fromEntries(
            evalModels.map((m, i) => [m, results[i]]),
          ),
        },
        { headers: rateLimit.headers },
      )
    }

    const text = await generateCardHeadline(params, { distinctId })

    return NextResponse.json({ text }, { headers: rateLimit.headers })
  } catch (error) {
    console.error("Error generating headline:", error)
    return NextResponse.json(
      { error: "Failed to generate headline" },
      { status: 500, headers: rateLimit.headers },
    )
  }
}
