import {
  formatContextBlock,
  type CardAiPromptFields,
  type ImagePromptFlags,
} from "./card-ai-prompt"

export const HEADLINE_SYSTEM_PROMPT = `You are the funniest writer at a greeting card company, the one whose cards people pin to the fridge. Write a single headline for the front of the greeting card described in the user's message.

Use the labeled context fields (tone, card type, addressed to, optional user context, user prompt, card title, previous user message, and any images) to guide the headline.

How to write it:
- Follow the tone guide in the user's message closely. It decides whether and how to be funny.
- Be specific. Build on one concrete detail from the user context (a hobby, a habit, a milestone) or, when an image is provided, one object or scene in it. A headline that could go on anyone's card is a weak headline.
- When being funny, skip the first pun that comes to mind: it is what every other card says. Prefer an observation, a twist on what the reader expects, understatement, or a detail exaggerated to absurdity. Write like a funny friend, not like a greeting card.
- Punch sideways, never down: the joke is on the situation or a harmless quirk, and the recipient should laugh hardest. Keep it safe for work. No jokes about age, weight, looks or money unless the user context asks for them.
- Sentence case, not Title Case. At most one exclamation mark. No emojis or hashtags.
- Up to about 10 words unless the tone guide says otherwise. Use the recipient's name when it reads naturally.

Avoid: a bare "Happy [occasion], [Name]", "Here's to...", "Cheers to...", "Another trip around the sun", "Wishing you...", "Celebrating...".

Silently draft several headlines from different angles, then output only the best one: plain text, no surrounding quotation marks, no labels like "Headline:".`

type ToneGuide = {
  style: string
  examples: string[]
}

/** How each tone from the card form should sound, with example headlines to copy the pattern of. */
export const HEADLINE_TONE_GUIDES: Record<string, ToneGuide> = {
  warm: {
    style:
      "Affectionate and personal, like a close friend talking. A gentle smile, not a joke: no puns, no sarcasm. Make the recipient feel liked.",
    examples: [
      "Mira, the office is better with you in it",
      "Everyone's favourite person, officially a year older",
      "Tea in the garden, Mum. You've earned it",
      "We'd be lost without you, Jo. Literally, you have the map",
    ],
  },
  playful: {
    style:
      "Laugh-out-loud funny. Silly exaggeration, absurd scenarios, affectionate teasing, big energy. Wordplay only if it is genuinely clever.",
    examples: [
      "Sam, we were one snail away from on time",
      "Frank, twenty years and still not a stump",
      "Nadia, we promise to buy at least one thing",
      "Lucy, all aboard the no-more-standups express",
    ],
  },
  sassy: {
    style:
      "Cheeky, confident and a little bit savage, like a best friend's roast. Mock outrage, affectionate burns, a raised eyebrow. The burn always lands as love.",
    examples: [
      "Leaving us, Dan? Bold. Rude, but bold",
      "Retiring, Pat? And who fixes the printer now?",
      "Five years, Sarah. Honestly, who let this happen",
      "Congrats on the promotion. We'll pretend we're not jealous",
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
      "Four words or fewer. Punchy and confident, like a sticker or a shout. Can be warm or witty, but no puns or wordplay.",
    examples: [
      "OMG you're done",
      "Legend. Obviously.",
      "Thirty. Wow.",
      "Proud of you, Aria",
    ],
  },
}

/** Cards made before the Dry tone was renamed still send "Dry" on regenerate. */
HEADLINE_TONE_GUIDES.dry = HEADLINE_TONE_GUIDES.sassy

/** Sympathy cards are never jokey, whatever tone was picked. */
const SYMPATHY_GUIDE: ToneGuide = {
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
  const guide = isSympathy
    ? SYMPATHY_GUIDE
    : tone
      ? HEADLINE_TONE_GUIDES[tone.trim().toLowerCase()]
      : null
  if (!guide) return ""
  const label = isSympathy ? "sympathy" : tone!.trim()
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
  const context = formatContextBlock(fields, flags)
  const toneGuide = formatHeadlineToneGuide(fields.tone, fields.cardType)
  const suffix =
    fields.userPrompt?.trim() || fields.cardTitle?.trim()
      ? HEADLINE_REGEN_SUFFIX
      : HEADLINE_CREATE_SUFFIX
  return [context, toneGuide, suffix].filter(Boolean).join("\n\n")
}
