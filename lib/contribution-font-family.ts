import {
  DEFAULT_MESSAGE_FONT_PRESET_ID,
  isMessageFontPresetId,
  type MessageFontPresetId,
} from "@/lib/message-font-presets"

/** Validates preset slug; `null`/empty clears; `undefined` means omit on PATCH. */
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
