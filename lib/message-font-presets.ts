const MESSAGE_FONT_PRESET_DEFS = [
  { id: "default", label: "Classic", cssVar: null },
  { id: "caveat", label: "Handwritten", cssVar: "--font-message-caveat" },
  {
    id: "dancing-script",
    label: "Script",
    cssVar: "--font-message-dancing-script",
  },
  { id: "playfair", label: "Elegant", cssVar: "--font-message-playfair" },
  { id: "lora", label: "Serif", cssVar: "--font-message-lora" },
  { id: "pacifico", label: "Playful", cssVar: "--font-message-pacifico" },
  {
    id: "merriweather",
    label: "Readable",
    cssVar: "--font-message-merriweather",
  },
] as const

/** Curated message font preset slugs (stored on card_contributions.font_family). */
export const MESSAGE_FONT_PRESETS: readonly (typeof MESSAGE_FONT_PRESET_DEFS)[number][] =
  MESSAGE_FONT_PRESET_DEFS

export const MESSAGE_FONT_PRESET_IDS = MESSAGE_FONT_PRESET_DEFS.map((p) => p.id)

export type MessageFontPresetId =
  (typeof MESSAGE_FONT_PRESET_DEFS)[number]["id"]

export type MessageFontPreset = (typeof MESSAGE_FONT_PRESET_DEFS)[number]

export const DEFAULT_MESSAGE_FONT_PRESET_ID: MessageFontPresetId =
  MESSAGE_FONT_PRESET_DEFS[0].id

const PRESET_BY_ID = new Map(
  MESSAGE_FONT_PRESET_DEFS.map((p) => [p.id, p] as const),
)

export function isMessageFontPresetId(
  value: string,
): value is MessageFontPresetId {
  return PRESET_BY_ID.has(value as MessageFontPresetId)
}

/** DB/API value for a panel preset selection (`null` = app default sans). */
export function storedFontFamilyFromPresetId(
  id: MessageFontPresetId,
): string | null {
  return id === DEFAULT_MESSAGE_FONT_PRESET_ID ? null : id
}

/** Resolved font-family for inline styles on canvas notes. */
export function getMessageFontFamily(
  presetId: string | null | undefined,
): string | undefined {
  if (!presetId || presetId === DEFAULT_MESSAGE_FONT_PRESET_ID) return undefined
  const preset = PRESET_BY_ID.get(presetId as MessageFontPresetId)
  if (!preset?.cssVar) return undefined
  // Fallback inside var() keeps the stack valid if MessageFontVariables is not mounted.
  return `var(${preset.cssVar}, system-ui), system-ui, sans-serif`
}

/** Active preset id for panel chips (null DB → default). */
export function activeMessageFontPresetId(
  fontFamily: string | null | undefined,
): MessageFontPresetId {
  if (!fontFamily || !isMessageFontPresetId(fontFamily)) {
    return DEFAULT_MESSAGE_FONT_PRESET_ID
  }
  return fontFamily
}
