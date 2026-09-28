/**
 * Soft pastel backdrops for card thumbnails (see `.card-pastel` in globals.css). Picked per
 * card (not per type) so a grid of cards of the same type still varies, and stable so a
 * card keeps its colour.
 */
// Warm tints around the brand coral (#ff5a4a, hue ~29) and the off-white ground (hue ~83):
// blush, coral, peach, apricot, sand and butter.
const PASTEL_HUES = [355, 18, 32, 48, 66, 84] as const

export function pastelHueFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return PASTEL_HUES[Math.abs(hash) % PASTEL_HUES.length]
}
