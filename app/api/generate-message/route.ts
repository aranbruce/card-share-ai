import { generateCardMessage } from "@/lib/generate-card-message"
import { getDistinctIdFromRequest } from "@/lib/posthog-distinct-id-from-request"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { after, NextRequest, NextResponse } from "next/server"
import { flushPostHogAiSpans } from "@/lib/posthog-ai-flush"

export async function POST(request: NextRequest) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:generate-message",
    maxRequests: 30,
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
      userPrompt?: string
      cardTitle?: string
      previousUserMessage?: string
      posthogDistinctId?: unknown
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

    // Registered before the call so spans are flushed on success and failure.
    after(flushPostHogAiSpans)
    const text = await generateCardMessage(
      {
        cardType,
        recipientName,
        userPrompt:
          typeof body.userPrompt === "string"
            ? body.userPrompt.trim()
            : undefined,
        cardTitle:
          typeof body.cardTitle === "string"
            ? body.cardTitle.trim()
            : undefined,
        previousUserMessage:
          typeof body.previousUserMessage === "string"
            ? body.previousUserMessage.trim()
            : undefined,
      },
      { distinctId },
    )

    return NextResponse.json({ text }, { headers: rateLimit.headers })
  } catch (error) {
    console.error("Error generating message:", error)
    return NextResponse.json(
      { error: "Failed to generate message" },
      { status: 500, headers: rateLimit.headers },
    )
  }
}
