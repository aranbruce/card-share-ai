import { generateText, Output } from "ai"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai-text-model"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { stripSurroundingQuotes } from "@/lib/strip-surrounding-quotes"

const cardCopySchema = z.object({
  headline: z
    .string()
    .describe(
      "A catchy, celebratory headline for the card. Plain text only — no surrounding quotation marks.",
    ),
})

export async function POST(request: NextRequest) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:generate-card-copy",
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
    const {
      cardType,
      recipientName,
      senderName,
      customMessage,
      attachedImageUrl,
      existingCardCoverImageUrl,
    } = await request.json()

    if (!cardType || !recipientName || !senderName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    const attachedUrl =
      typeof attachedImageUrl === "string" ? attachedImageUrl.trim() : ""
    const coverUrl =
      typeof existingCardCoverImageUrl === "string"
        ? existingCardCoverImageUrl.trim()
        : ""

    const imageContextParts: string[] = []
    if (attachedUrl)
      imageContextParts.push(
        "An attached reference image has been provided — align the copy with its mood, subject, and visual style.",
      )
    if (coverUrl)
      imageContextParts.push(
        "The existing card cover image has been provided — align the copy with what is already shown on the card.",
      )
    const imageContext =
      imageContextParts.length > 0 ? `\n${imageContextParts.join(" ")}` : ""

    const systemPrompt = `You are a creative greeting card writer. Generate heartfelt, personalized greeting card copy for a ${cardType} card.

The card is from: ${senderName}
To: ${recipientName}
${customMessage ? `Additional context: ${customMessage}` : ""}
${imageContext}
Create warm, appropriate copy that matches the card type.

Never wrap the headline in ASCII or curly quotation marks — output the words themselves only.`

    const userMessage = `Please create greeting card copy for a ${cardType} card to ${recipientName} from ${senderName}.${customMessage ? ` Additional context: ${customMessage}` : ""}`

    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image"; image: URL }
    const contentParts: ContentPart[] = [{ type: "text", text: userMessage }]
    if (attachedUrl) {
      contentParts.push({
        type: "text",
        text: "Attached reference image (use its style, mood, and subject as context for the copy):",
      })
      contentParts.push({ type: "image", image: new URL(attachedUrl) })
    }
    if (coverUrl) {
      contentParts.push({
        type: "text",
        text: "Existing card cover image (align the copy with what is shown here):",
      })
      contentParts.push({ type: "image", image: new URL(coverUrl) })
    }

    const { output } = await generateText({
      model: getTextModel(),
      output: Output.object({
        schema: cardCopySchema,
      }),
      messages: [
        {
          role: "user",
          content: contentParts.length > 1 ? contentParts : userMessage,
        },
      ],
      system: systemPrompt,
    })

    const cardCopy = {
      headline: stripSurroundingQuotes(output.headline),
    }

    return NextResponse.json({ cardCopy }, { headers: rateLimit.headers })
  } catch (error) {
    console.error("Error generating card copy:", error)
    return NextResponse.json(
      { error: "Failed to generate card copy" },
      { status: 500, headers: rateLimit.headers },
    )
  }
}
