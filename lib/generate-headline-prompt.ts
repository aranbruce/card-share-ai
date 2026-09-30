import {
  formatContextBlock,
  type CardAiPromptFields,
  type ImagePromptFlags,
} from "./card-ai-prompt"
import { getToneDefinition, resolveCardTone } from "./card-tones"

export const HEADLINE_SYSTEM_PROMPT = `You are the funniest writer at a greeting card company, the one whose cards people pin to the fridge. Write a single headline for the front of the greeting card described in the user's message.

Use the labeled context fields (tone, card type, addressed to, optional user context, user prompt, card title, previous user message, and any images) to guide the headline.

How to write it:
- Follow the tone guide in the user's message closely. It decides the voice, whether to be funny, and how.
- Be specific. Build on one concrete detail from the user context (a hobby, a habit, a milestone) or, when an image is provided, one object or scene in it. A headline that could go on anyone's card is a weak headline.
- Unless the tone guide asks for puns, skip the first pun that comes to mind: it is what every other card says. Prefer an observation, a twist on what the reader expects, or a detail exaggerated to absurdity.
- Punch sideways, never down: the joke is on the situation or a harmless quirk, and the recipient should laugh hardest. Keep it safe for work. No jokes about age, weight, looks or money unless the user context asks for them.
- US English spelling. Sentence case, not Title Case, unless the tone guide says otherwise. No period at the end. At most one exclamation mark. No emojis or hashtags.
- Up to about 10 words unless the tone guide says otherwise. Use the recipient's name when it reads naturally.

Avoid: a bare "Happy [occasion], [Name]", "Here's to...", "Cheers to...", "Another trip around the sun", "Wishing you...", "Celebrating...".

Silently draft several headlines from different angles, then output only the best one: plain text, no surrounding quotation marks, no labels like "Headline:".`

/** Sympathy cards are never jokey, whatever tone was picked. */
const SYMPATHY_GUIDE = {
  style:
    "This is a sympathy card: gentle, sincere and kind. No jokes, puns or wordplay, whatever tone was selected. A soft, specific acknowledgement of who or what was lost.",
  examples: [
    "Thinking of you and Luna",
    "We're so sorry, Sam. We're here",
    "Holding you close this week",
  ],
}

export function formatHeadlineToneGuide(
  tone?: string,
  cardType?: string,
): string {
  const isSympathy = cardType?.trim().toLowerCase() === "sympathy"
  const definition = getToneDefinition(tone)
  const guide = isSympathy
    ? SYMPATHY_GUIDE
    : definition
      ? {
          style: definition.headlineStyle,
          examples: definition.headlineExamples,
        }
      : null
  if (!guide) return ""
  const label = isSympathy ? "sympathy" : resolveCardTone(tone)
  const examples = guide.examples.map((e) => `- ${e}`).join("\n")
  return `Tone guide (${label}): ${guide.style}\nExample headlines in this tone (match the style, never reuse the content):\n${examples}`
}

const HEADLINE_CREATE_SUFFIX = "Write a headline for this card."
const HEADLINE_REGEN_SUFFIX =
  "Based on the user's request, write a new headline."

export function assembleHeadlineUserPrompt(
  fields: CardAiPromptFields,
  flags: ImagePromptFlags = {},
): string {
  // Sympathy cards drop the picked tone entirely, so "Tone: Dad jokes" can't pull against the gentle guide.
  const isSympathy = fields.cardType.trim().toLowerCase() === "sympathy"
  const context = formatContextBlock(
    isSympathy ? { ...fields, tone: undefined } : fields,
    flags,
  )
  const toneGuide = formatHeadlineToneGuide(fields.tone, fields.cardType)
  const suffix =
    fields.userPrompt?.trim() || fields.cardTitle?.trim()
      ? HEADLINE_REGEN_SUFFIX
      : HEADLINE_CREATE_SUFFIX
  return [context, toneGuide, suffix].filter(Boolean).join("\n\n")
}
