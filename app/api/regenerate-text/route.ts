import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { getTextModel } from "@/lib/ai-text-model"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { stripSurroundingQuotes } from "@/lib/strip-surrounding-quotes"

const SYSTEM_OUTPUT_RULES = `You help rewrite greeting card text. Output only the requested field: plain text, no markdown, no labels like "Headline:" or "Message:", no leading or trailing quotation marks.`

const MAX_BLOCK_BODY_CHARS = 12_000

/** JSON-encode block payloads so delimiter-like text cannot break the structure. */
function block(label: string, body: string): string {
  const capped =
    body.length > MAX_BLOCK_BODY_CHARS
      ? `${body.slice(0, MAX_BLOCK_BODY_CHARS)}\n…[truncated]`
      : body
  return `<<<${label}>>>\n${JSON.stringify(capped)}\n<<<END_${label}>>>`
}

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
      coverImagePrompt,
    } = (await request.json()) as {
      field?: string
      cardType?: string
      recipientName?: string
      senderName?: string
      currentValue?: string
      userPrompt?: string
      /** Optional: current cover art description so the headline matches the image theme. */
      coverImagePrompt?: string
    }

    if (!field || !cardType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    const cur = typeof currentValue === "string" ? currentValue : ""
    const userReq = typeof userPrompt === "string" ? userPrompt : ""
    const imagePrompt =
      typeof coverImagePrompt === "string" ? coverImagePrompt.trim() : ""

    let userContent = ""

    if (field === "headline") {
      const imageContext =
        imagePrompt.length > 0
          ? `\nThe cover illustration is described as follows; align the headline’s mood and subject with this art (the headline text is shown separately from the image — do not describe rendering text into the picture):\n${block("COVER_IMAGE_PROMPT", imagePrompt)}\n`
          : ""
      userContent = `Generate a single catchy, celebratory headline for a ${cardType} greeting card to ${recipientName ?? ""} from ${senderName ?? ""}.
${imageContext}
${block("CURRENT_HEADLINE", cur)}

${block("USER_CHANGE_REQUEST", userReq)}

Based on the user's request, write a new headline.`
    } else if (field === "message") {
      userContent = `Generate a heartfelt message for a ${cardType} greeting card to ${recipientName ?? ""} from ${senderName ?? ""}.

${block("CURRENT_MESSAGE", cur)}

${block("USER_CHANGE_REQUEST", userReq)}

Based on the user's request, write a new message that's warm and personal. Include a sign-off at the end.`
    } else if (field === "contribution_message") {
      userContent = `This is a short personal note from someone signing a ${cardType} greeting card. The card is for ${recipientName ?? ""}; the main card is from ${senderName ?? ""}. The person writing this note is a friend or family member adding their own message.

${block("CURRENT_NOTE", cur)}

${block("USER_CHANGE_REQUEST", userReq)}

Rewrite the note to be warm and personal. Keep it concise.`
    } else {
      return NextResponse.json(
        { error: "Invalid field" },
        { status: 400, headers: rateLimit.headers },
      )
    }

    const { text } = await generateText({
      model: getTextModel(),
      system: SYSTEM_OUTPUT_RULES,
      messages: [
        {
          role: "user",
          content: userContent,
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
