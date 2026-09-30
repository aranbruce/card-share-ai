/**
 * Text models for card copy via Vercel AI Gateway, one per job so each can be tuned on its own.
 * Override per environment with AI_HEADLINE_MODEL / AI_MESSAGE_MODEL,
 * e.g. `anthropic/claude-opus-5.5` to compare providers.
 */
export const DEFAULT_HEADLINE_MODEL = "google/gemini-3.8-flash"
export const DEFAULT_MESSAGE_MODEL = "google/gemini-3.8-flash"

/** Model for the card's front headline (generate-headline). */
export function getHeadlineModel(): string {
  return process.env.AI_HEADLINE_MODEL?.trim() || DEFAULT_HEADLINE_MODEL
}

/** Model for the card's inside note (generate-message). */
export function getMessageModel(): string {
  return process.env.AI_MESSAGE_MODEL?.trim() || DEFAULT_MESSAGE_MODEL
}
