import {
  DEFAULT_MESSAGE_FONT_PRESET_ID,
  isMessageFontPresetId,
  type MessageFontPresetId,
} from "@/lib/message-font-presets"

/**
 * Normalize a `font_family` value for persistence.
 *
 * Callers must tell omit apart from invalid using request presence (e.g.
 * `hasOwnProperty("fontFamily")` on the JSON body):
 * - Field omitted: do not call this, or only run other PATCH fields.
 * - Field present, `val === undefined` after parse: treat as invalid → 400.
 * - Field present, valid slug: returns the slug; default/clear → `null`.
 *
 * Return values:
 * - `undefined` — invalid input (unknown slug, wrong type). Not used for omit.
 * - `null` — store app default sans (empty, or default preset id).
 * - `MessageFontPresetId` — store the slug.
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
