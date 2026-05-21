import {
  DEFAULT_MESSAGE_FONT_PRESET_ID,
  isMessageFontPresetId,
  type MessageFontPresetId,
} from "@/lib/message-font-presets"

/**
 * Validates preset slug for storage.
 * - `undefined`: field omitted (do not update on PATCH).
 * - `null` / empty / default id: clear to app sans.
 * - preset slug: store as-is.
 * - `undefined` for non-string or unknown slug: invalid (treat as validation error when field was sent).
 */
export function normalizeContributionFontFamily(
  val: unknown,
): MessageFontPresetId | null | undefined {
  if (val === undefined) return undefined
  if (val === null) return null
  if (typeof val !== "string") return undefined
  const t = val.trim()
  if (t === "" || t === DEFAULT_MESSAGE_FONT_PRESET_ID) return null
  return isMessageFontPresetId(t) ? t : undefined
}
