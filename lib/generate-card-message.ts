import { generateText } from "ai"
import {
  assembleMessageUserPrompt,
  MESSAGE_SYSTEM_PROMPT,
} from "@/lib/generate-message-prompt"
import { aiTelemetry } from "@/lib/ai-telemetry"
import { getMessageModel } from "@/lib/ai-text-model"
import { resolvePromptFields } from "@/lib/card-ai-prompt"
import { stripSurroundingQuotes } from "@/lib/strip-surrounding-quotes"

export type GenerateCardMessageParams = {
  cardType: string
  recipientName: string
  userPrompt?: string
  cardTitle?: string
  previousUserMessage?: string
}

export async function generateCardMessage(
  params: GenerateCardMessageParams,
  options?: { distinctId?: string | null },
): Promise<string> {
  const fields = resolvePromptFields(params)
  const userContent = assembleMessageUserPrompt(fields)

  const { text } = await generateText({
    model: getMessageModel(),
    system: MESSAGE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    ...aiTelemetry("generate-card-message", options?.distinctId),
  })

  return stripSurroundingQuotes(text)
}
