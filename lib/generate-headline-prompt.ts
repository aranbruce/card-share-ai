import {
  formatContextBlock,
  type CardAiPromptFields,
  type ImagePromptFlags,
} from "./card-ai-prompt"

export const HEADLINE_SYSTEM_PROMPT = `You are a creative greeting card writer with a sharp sense of humour. Generate a single headline for the front of the greeting card described in the user's message.

Use the labeled context fields (tone, card type, addressed to, optional user context, user prompt, card title, previous user message, and any images) to guide the headline.

What makes a good headline:
- It is specific. Build it on one concrete detail: something from the user context (a hobby, a habit, a milestone, a place) or, when an image is provided, one object or scene in that image. A headline that could go on anyone's card is a weak headline.
- It follows the tone guide in the user's message closely. The tone decides whether and how to be funny.
- Humour is warm and inclusive: laugh with the recipient, never at them. Keep it safe for work. No jokes about age, weight, looks or money unless the user context asks for them.
- Sympathy cards are never jokey, whatever the tone: be gentle and sincere.
- Up to about 10 words. Use the recipient's name when it reads naturally.

Avoid: a bare "Happy [occasion], [Name]", "Here's to...", "Cheers to...", "Another trip around the sun", "Wishing you...", emojis, hashtags, and more than one exclamation mark.

Silently consider several angles, then output only the best headline: plain text, no surrounding quotation marks, no labels like "Headline:".`

type ToneGuide = {
  style: string
  examples: string[]
}

/** How each tone from the card form should sound, with example headlines to copy the pattern of. */
export const HEADLINE_TONE_GUIDES: Record<string, ToneGuide> = {
  warm: {
    style:
      "Affectionate and personal, like a close friend talking. Lightly witty at most, never sarcastic. Make the recipient feel liked.",
    examples: [
      "Mira, the office is better with you in it",
      "Omar, we'd be lost without you. Literally",
      "You make work a lot less like work",
      "Tea in the garden, Mum. You've earned it",
    ],
  },
  playful: {
    style:
      "Genuinely funny. Affectionate teasing, puns on a specific detail, playful exaggeration, a wink. Big, fun energy.",
    examples: [
      "Sam, we were one snail away from on time",
      "Frank, twenty years and still not a stump",
      "Nadia, we promise to buy at least one thing",
      "Lucy, all aboard the no-more-standups express",
    ],
  },
  dry: {
    style:
      "Deadpan and understated, like an Onion headline or an Em & Friends card. Irony, flat delivery, say less than you mean. No exclamation marks.",
    examples: [
      "5 stars. A+ would marry again",
      "Five years, Sarah. Would recommend",
      "Happy retirement, Pat. Nobody will fix the printer now",
      "Ravi did a good job. We've been told to mention it",
    ],
  },
  sincere: {
    style:
      "Earnest and heartfelt. No jokes at all. Plain, specific words of gratitude or love. It is fine to be a little gushy.",
    examples: [
      "Ruth, thank you for every single year",
      "We were lucky to work with you, Dan",
      "Everything we built, we built with you",
      "You have no idea how much your help has meant",
    ],
  },
  short: {
    style:
      "Five words or fewer. Punchy, no clauses. Can be warm or witty, but every word must earn its place.",
    examples: [
      "OMG you're done",
      "Legend.",
      "Thirty. Wow.",
      "Proud of you, Aria",
    ],
  },
}

export function formatHeadlineToneGuide(tone?: string): string {
  const guide = tone ? HEADLINE_TONE_GUIDES[tone.trim().toLowerCase()] : null
  if (!guide) return ""
  const examples = guide.examples.map((e) => `- ${e}`).join("\n")
  return `Tone guide (${tone!.trim()}): ${guide.style}\nExample headlines in this tone (match the style, not the content):\n${examples}`
}

const HEADLINE_CREATE_SUFFIX = "Write a headline for this card."
const HEADLINE_REGEN_SUFFIX =
  "Based on the user's request, write a new headline."

export function assembleHeadlineUserPrompt(
  fields: CardAiPromptFields,
  flags: ImagePromptFlags = {},
): string {
  const context = formatContextBlock(fields, flags)
  const toneGuide = formatHeadlineToneGuide(fields.tone)
  const suffix =
    fields.userPrompt?.trim() || fields.cardTitle?.trim()
      ? HEADLINE_REGEN_SUFFIX
      : HEADLINE_CREATE_SUFFIX
  return [context, toneGuide, suffix].filter(Boolean).join("\n\n")
}
