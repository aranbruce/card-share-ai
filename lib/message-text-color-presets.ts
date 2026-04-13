/**
 * Starting text colors for new canvas messages (readable on warm/light card stock).
 * Used when placing a compose draft (client) and on insert if no color is sent (API).
 */
export const MESSAGE_TEXT_COLOR_PRESETS = [
  "#171717",
  "#1e3a8a",
  "#9f1239",
  "#166534",
  "#92400e",
  "#6b21a8",
  "#0f766e",
  "#b45309",
  "#be185d",
  "#4338ca",
  "#854d0e",
  "#a21caf",
] as const

export function randomPresetTextColor(): string {
  const i = Math.floor(Math.random() * MESSAGE_TEXT_COLOR_PRESETS.length)
  return MESSAGE_TEXT_COLOR_PRESETS[i]!
}
