import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai-text-model"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { stripSurroundingQuotes } from "@/lib/strip-surrounding-quotes"

export async function POST(request: NextRequest) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api-regenerate-text",
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
    const {
      field,
      cardType,
      recipientName,
      senderName,
      currentValue,
      userPrompt,
    } = await request.json()

    if (!field || !cardType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    let prompt = ""

    if (field === "headline") {
      prompt = `Generate a single catchy, celebratory headline for a ${cardType} greeting card to ${recipientName} from ${senderName}. 
      
Current headline is: "${currentValue}"

User's request for the change: "${userPrompt}"

Based on the user's request, generate a new headline. Respond with the headline text only: plain characters, no leading or trailing " or ' characters, no markdown, no labels.`
    } else if (field === "message") {
      prompt = `Generate a heartfelt message for a ${cardType} greeting card to ${recipientName} from ${senderName}.

Current message is: "${currentValue}"

User's request for the change: "${userPrompt}"

Based on the user's request, generate a new message that's warm and personal. Include a sign-off at the end. Respond with the message text only: plain characters, no leading or trailing " or ' characters, no markdown, no labels.`
    } else if (field === "contribution_message") {
      prompt = `This is a short personal note from someone signing a ${cardType} greeting card. The card is for ${recipientName}; the main card is from ${senderName}. The person writing this note is a friend or family member adding their own message.

Current note text: "${currentValue}"

User's request for the change: "${userPrompt}"

Rewrite the note to be warm and personal. Keep it concise. Respond with the note text only: plain characters, no leading or trailing " or ' characters, no markdown, no labels.`
    } else {
      return NextResponse.json(
        { error: "Invalid field" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    const { text } = await generateText({
      model: getTextModel(),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    return NextResponse.json(
      { text: stripSurroundingQuotes(text) },
      { headers: rateLimit.headers },
    )
  } catch (error) {
    console.error("Error regenerating text:", error)
    return NextResponse.json(
      { error: "Failed to regenerate text" },
      { status: 500, headers: rateLimit.headers },
    )
  }
}
