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
  message: z
    .string()
    .describe(
      "The main message body of the card. Plain text only — no surrounding quotation marks.",
    ),
  signoff: z
    .string()
    .describe(
      "A warm closing/signature line. Plain text only — no surrounding quotation marks.",
    ),
  imagePrompt: z
    .string()
    .describe(
      "A detailed prompt for generating the card image. Do not wrap the prompt in quotation marks.",
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
      existingHeadline,
      existingMessage,
      existingSignoff,
    } = await request.json()

    if (!cardType || !recipientName || !senderName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    const hasExisting =
      (typeof existingHeadline === "string" && existingHeadline.trim()) ||
      (typeof existingMessage === "string" && existingMessage.trim()) ||
      (typeof existingSignoff === "string" && existingSignoff.trim())

    const existingBlock = hasExisting
      ? `
You already have draft copy — refine and improve it (keep the same tone and intent unless context asks otherwise).
Current headline: ${typeof existingHeadline === "string" ? existingHeadline : ""}
Current message body: ${typeof existingMessage === "string" ? existingMessage : ""}
Current sign-off: ${typeof existingSignoff === "string" ? existingSignoff : ""}`
      : ""

    const systemPrompt = `You are a creative greeting card writer. ${hasExisting ? "Refine" : "Generate heartfelt, personalized"} greeting card copy for a ${cardType} card.
    
The card is from: ${senderName}
To: ${recipientName}
${customMessage ? `Additional context: ${customMessage}` : ""}
${existingBlock}

Create warm, appropriate copy that matches the card type. The image prompt should be descriptive for AI image generation.

Never wrap the headline, message body, sign-off, or image prompt in ASCII or curly quotation marks — output the words themselves only.`

    const userLead = hasExisting
      ? `Please refine this greeting card copy for a ${cardType} card to ${recipientName} from ${senderName}.`
      : `Please create greeting card copy for a ${cardType} card to ${recipientName} from ${senderName}.`

    const { output } = await generateText({
      model: getTextModel(),
      output: Output.object({
        schema: cardCopySchema,
      }),
      messages: [
        {
          role: "user",
          content: `${userLead} ${customMessage ? `Additional context: ${customMessage}` : ""}`,
        },
      ],
      system: systemPrompt,
    })

    const cardCopy = {
      ...output,
      headline: stripSurroundingQuotes(output.headline),
      message: stripSurroundingQuotes(output.message),
      signoff: stripSurroundingQuotes(output.signoff),
      imagePrompt: stripSurroundingQuotes(output.imagePrompt),
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
