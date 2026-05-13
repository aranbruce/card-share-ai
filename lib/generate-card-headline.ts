import { generateText, Output } from "ai"
import { z } from "zod"
import { getTextModel } from "@/lib/ai-text-model"
import { stripSurroundingQuotes } from "@/lib/strip-surrounding-quotes"

const cardCopySchema = z.object({
  headline: z
    .string()
    .describe(
      "A catchy, celebratory headline for the card. Plain text only — no surrounding quotation marks.",
    ),
})

export async function generateCardHeadline(params: {
  cardType: string
  recipientName: string
  senderName: string
  customMessage?: string
}): Promise<string> {
  const { cardType, recipientName, senderName, customMessage } = params

  const systemPrompt = `You are a creative greeting card writer. Generate a single punchy headline for a ${cardType} greeting card.

The card is from: ${senderName}
To: ${recipientName}
${customMessage ? `Additional context: ${customMessage}` : ""}
Output only the headline — no other fields, no surrounding quotation marks.`

  const userMessage = `Write a headline for a ${cardType} card to ${recipientName} from ${senderName}.${customMessage ? ` Additional context: ${customMessage}` : ""}`

  const { output } = await generateText({
    model: getTextModel(),
    output: Output.object({ schema: cardCopySchema }),
    messages: [{ role: "user", content: userMessage }],
    system: systemPrompt,
  })

  return stripSurroundingQuotes(output.headline)
}
