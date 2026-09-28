/**
 * Soft pastel backdrops for card thumbnails (see `.card-pastel` in globals.css): warm tints
 * around the brand coral (#ff5a4a, hue ~29) and off-white ground (hue ~83), plus a dusty
 * mauve and sage for variety.
 */
export const PASTEL_HUES = [
  330, 345, 358, 10, 20, 30, 40, 52, 64, 76, 90, 120,
] as const

/** Cards before this one (in display order) whose colour it must stand apart from. Covers
 * the neighbour to the left and the card above in a grid of up to three columns. */
const NO_REPEAT_WINDOW = 3
/** Smallest hue difference (degrees) from those cards, so neighbours read as different. */
const MIN_HUE_GAP = 25

function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

function hash(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * A pastel hue for each card, in display order. Each card starts from a colour of its own
 * (so it mostly keeps it as the list changes) and steps on to the next colour while a nearby
 * card has the same or a similar one, so neighbours always look different.
 */
export function pastelHuesFor(ids: readonly string[]): number[] {
  const chosen: number[] = []
  for (const id of ids) {
    const recent = chosen.slice(-NO_REPEAT_WINDOW)
    const start = hash(id) % PASTEL_HUES.length
    // The first colour, from the card's own, that stands apart from its neighbours; failing
    // that, the one that stands apart most.
    let index = start
    let bestGap = -1
    for (let step = 0; step < PASTEL_HUES.length; step++) {
      const candidate = (start + step) % PASTEL_HUES.length
      const gap = Math.min(
        360,
        ...recent.map((other) => hueGap(PASTEL_HUES[candidate], other)),
      )
      if (gap >= MIN_HUE_GAP) {
        index = candidate
        break
      }
      if (gap > bestGap) {
        bestGap = gap
        index = candidate
      }
    }
    chosen.push(PASTEL_HUES[index])
  }
  return chosen
}
