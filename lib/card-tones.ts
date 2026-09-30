/** The tones offered on the create form and in the Slack bot, in display order. */
export const CARD_TONES = [
  "Heartfelt",
  "Roast",
  "Dad jokes",
  "Hype",
  "Epic",
] as const

export type CardTone = (typeof CARD_TONES)[number]

export const DEFAULT_CARD_TONE: CardTone = "Heartfelt"

type ToneDefinition = {
  /** How the headline should sound. */
  headlineStyle: string
  /** Example headlines to copy the pattern of (never about the test or demo recipients). */
  headlineExamples: string[]
  /** Visual mood for the cover art, so the image model never draws the tone's name literally. */
  imageMood: string
}

const TONE_DEFINITIONS: Record<CardTone, ToneDefinition> = {
  Heartfelt: {
    headlineStyle:
      "Earnest, warm and personal. No jokes or puns. Plain, specific words of gratitude or affection, like a close friend saying what they really mean. A little gushy is fine.",
    headlineExamples: [
      "Ruth, thank you for every single year",
      "Mira, the office is better with you in it",
      "We were lucky to work with you, Dan",
      "Everything we built, we built with you",
    ],
    imageMood:
      "soft, warm and tender, with gentle light and cozy, personal detail",
  },
  Roast: {
    headlineStyle:
      "An affectionate roast, like a best friend's wedding toast. Cheeky, confident, mock outrage and gentle burns about a harmless habit or quirk from the context. It must land as love: never about looks, age, weight or money.",
    headlineExamples: [
      "Leaving us, Dan? Bold. Rude, but bold",
      "Retiring, Pat? And who fixes the printer now?",
      "Five years, Sarah. Honestly, who keeps approving this?",
      "Promoted, Mia? We'll pretend we're not jealous",
    ],
    imageMood:
      "bold, cheeky and mischievous, with bright colors and a comic, playful energy",
  },
  "Dad jokes": {
    headlineStyle:
      "A proudly terrible dad joke. It MUST contain one obvious pun: swap a word for a sound-alike from the world of a detail in the context (coffee: brew, latte, espresso; music: note, treble, bass; plants: grow, leaf, thyme). The pun should be impossible to miss, the kind that makes people groan and then smile. A headline without a real pun is a failure. Keep it clean and short.",
    headlineExamples: [
      "Jo, you're one in a melon",
      "Happy retirement, Pat. Time to un-wine-d",
      "Ben, you're a real fungi to work with",
      "Kate, we think you're tea-riffic. Sorry, not sorry",
    ],
    imageMood:
      "light-hearted and goofy, with cheerful colors and a whimsical, silly feel",
  },
  Hype: {
    headlineStyle:
      "Sports-commentator hype. Huge energy, short punchy fragments, like the crowd just went wild. You may put one or two words in CAPS for emphasis. Celebrate the achievement or detail from the context like a championship win.",
    headlineExamples: [
      "Sarah. Five years. ABSOLUTELY unstoppable",
      "Ladies and gentlemen, Dan has LEFT the building",
      "Thirty years old and still undefeated, Mia",
      "Ana just shipped it and the crowd goes WILD",
    ],
    imageMood:
      "high-energy and triumphant, with confetti, dynamic movement and stadium-lights excitement",
  },
  Epic: {
    headlineStyle:
      "A movie-trailer voiceover that treats an everyday detail from the context as a legendary saga. Grand, dramatic, deadpan-serious about small things. Up to about 12 words.",
    headlineExamples: [
      "In a world of broken printers, one man dared to retire",
      "Five years. Four reorgs. One legend: Sarah",
      "This summer, one team will ship the impossible",
      "Some heroes wear capes. Mia brings snacks",
    ],
    imageMood:
      "cinematic and grand like a movie poster, with dramatic lighting and heroic scale",
  },
}

/** Tones from before the current set, still stored on older cards and sent on regenerate. */
const LEGACY_TONES: Record<string, CardTone> = {
  warm: "Heartfelt",
  sincere: "Heartfelt",
  short: "Heartfelt",
  playful: "Hype",
  sassy: "Roast",
  dry: "Roast",
}

/** Resolves a stored or submitted tone (any case, current or legacy) to a current tone. */
export function resolveCardTone(tone?: string): CardTone | null {
  const key = tone?.trim().toLowerCase()
  if (!key) return null
  const current = CARD_TONES.find((t) => t.toLowerCase() === key)
  return current ?? LEGACY_TONES[key] ?? null
}

export function getToneDefinition(tone?: string): ToneDefinition | null {
  const resolved = resolveCardTone(tone)
  return resolved ? TONE_DEFINITIONS[resolved] : null
}

const SYMPATHY_IMAGE_MOOD =
  "gentle, calm and comforting, with soft muted light and nothing playful or jokey"

/** Visual mood for the cover art. Sympathy cards stay gentle whatever tone was picked. */
export function getImageMood(tone?: string, cardType?: string): string | null {
  if (cardType?.trim().toLowerCase() === "sympathy") return SYMPATHY_IMAGE_MOOD
  return getToneDefinition(tone)?.imageMood ?? null
}
