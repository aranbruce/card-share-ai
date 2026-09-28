/**
 * Soft pastel backdrops for card thumbnails (see `.card-pastel` in globals.css). Picked per
 * card (not per type) so a grid of cards of the same type still varies, and stable so a
 * card keeps its colour.
 */
const PASTEL_HUES = [20, 55, 95, 150, 195, 235, 280, 330] as const

export function pastelHueFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return PASTEL_HUES[Math.abs(hash) % PASTEL_HUES.length]
}
