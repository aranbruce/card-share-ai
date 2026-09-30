import { generateText, Output } from "ai"
import { z } from "zod"
import {
  assembleHeadlineUserPrompt,
  HEADLINE_SYSTEM_PROMPT,
} from "@/lib/generate-headline-prompt"
import { aiTelemetry } from "@/lib/ai-telemetry"
import { getHeadlineModel } from "@/lib/ai-text-model"
import {
  buildMultimodalUserMessage,
  resolvePromptFields,
} from "@/lib/card-ai-prompt"
import { stripSurroundingQuotes } from "@/lib/strip-surrounding-quotes"

const cardHeadlineSchema = z.object({
  headline: z
    .string()
    .describe(
      "The card's front headline, written in the requested tone. Plain text only, no surrounding quotation marks.",
    ),
})

export type GenerateCardHeadlineParams = {
  cardType: string
  recipientName: string
  tone?: string
  userContext?: string
  userPrompt?: string
  cardTitle?: string
  attached?: Uint8Array
  previous?: Uint8Array
}

export async function generateCardHeadline(
  params: GenerateCardHeadlineParams,
  options?: { distinctId?: string | null },
): Promise<string> {
  const fields = resolvePromptFields(params)
  const flags = {
    hasPreviousImage: Boolean(params.previous),
    hasAttachedImage: Boolean(params.attached),
  }
  const userContent = assembleHeadlineUserPrompt(fields, flags)

  const messages = buildMultimodalUserMessage(userContent, {
    previous: params.previous,
    attached: params.attached,
  })

  const { output } = await generateText({
    model: getHeadlineModel(),
    output: Output.object({ schema: cardHeadlineSchema }),
    messages,
    system: HEADLINE_SYSTEM_PROMPT,
    ...aiTelemetry("generate-card-headline", options?.distinctId),
  })

  return stripSurroundingQuotes(output.headline)
}
