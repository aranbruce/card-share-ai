/** Curated message font preset slugs (stored on card_contributions.font_family). */
export const MESSAGE_FONT_PRESET_IDS = [
  "default",
  "caveat",
  "dancing-script",
  "playfair",
  "lora",
  "pacifico",
  "merriweather",
] as const

export type MessageFontPresetId = (typeof MESSAGE_FONT_PRESET_IDS)[number]

export const DEFAULT_MESSAGE_FONT_PRESET_ID: MessageFontPresetId = "default"

export type MessageFontPreset = {
  id: MessageFontPresetId
  label: string
  /** CSS variable set by MessageFontVariables (default uses app sans). */
  cssVar: string | null
}

export const MESSAGE_FONT_PRESETS: readonly MessageFontPreset[] = [
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

const PRESET_BY_ID = new Map(
  MESSAGE_FONT_PRESETS.map((p) => [p.id, p] as const),
)

export function isMessageFontPresetId(
  value: string,
): value is MessageFontPresetId {
  return (MESSAGE_FONT_PRESET_IDS as readonly string[]).includes(value)
}

/** Resolved font-family for inline styles on canvas notes. */
export function getMessageFontFamily(
  presetId: string | null | undefined,
): string | undefined {
  if (!presetId || presetId === "default") return undefined
  const preset = PRESET_BY_ID.get(presetId as MessageFontPresetId)
  if (!preset?.cssVar) return undefined
  return `var(${preset.cssVar}), system-ui, sans-serif`
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
