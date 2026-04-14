/**
 * Text generation for card copy (headline, message, etc.) via Vercel AI Gateway.
 * Override with AI_TEXT_MODEL, e.g. `openai/gpt-4o` to compare providers.
 */
export const DEFAULT_TEXT_MODEL = "xai/grok-4.1-fast-non-reasoning"

export function getTextModel(): string {
  return process.env.AI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL
}
