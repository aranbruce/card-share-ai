/**
 * Text generation for card copy (headline, message, etc.) via Vercel AI Gateway.
 * Override with AI_TEXT_MODEL, e.g. `anthropic/claude-opus-5.5` to compare providers.
 */
export const DEFAULT_TEXT_MODEL = "google/gemini-3.8-flash"

export function getTextModel(): string {
  return process.env.AI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL
}
