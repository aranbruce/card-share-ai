/**
 * Pastel backdrops for card thumbnails (see `.card-pastel` in globals.css), matching the
 * browse page's occasion tiles: each hue blends diagonally into the one 30° on, around the
 * whole wheel (peach, sand, olive, green, teal, blue, lilac, pink).
 */
export const PASTEL_HUES = [
  0, 18, 40, 70, 100, 130, 160, 190, 220, 250, 290, 330,
] as const

/** Cards before this one (in display order) whose colour it must stand apart from. Covers
 * the neighbour to the left and the card above in a grid of up to three columns. */
const NO_REPEAT_WINDOW = 3
/** Smallest hue difference (degrees) from those cards, so neighbours read as different. */
const MIN_HUE_GAP = 25

/** A backdrop blends from its hue to this many degrees on (see `.card-pastel`). */
const BACKDROP_SPREAD = 30
/** Smallest hue difference (degrees) between a plain gradient cover and any part of the
 * backdrop behind it. Cover and backdrop are about as light as each other, so only hue sets
 * the card apart. */
const MIN_COVER_GAP = 60

function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

/** How far a cover hue is from the nearest colour in a backdrop's blend. */
function coverGap(backdrop: number, cover: number): number {
  const d = (((cover - backdrop) % 360) + 360) % 360
  return d <= BACKDROP_SPREAD ? 0 : Math.min(d - BACKDROP_SPREAD, 360 - d)
}

function contrastsWithCover(backdrop: number, cover: number | null): boolean {
  return cover === null || coverGap(backdrop, cover) >= MIN_COVER_GAP
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
 *
 * `coverHues[i]` is the hue of card i's plain gradient cover, or null when it has an image;
 * a card's backdrop always stands well apart from its plain cover.
 */
export function pastelHuesFor(
  ids: readonly string[],
  coverHues: readonly (number | null)[] = [],
): number[] {
  const chosen: number[] = []
  ids.forEach((id, i) => {
    const cover = coverHues[i] ?? null
    const recent = chosen.slice(-NO_REPEAT_WINDOW)
    const start = hash(id) % PASTEL_HUES.length
    // The first colour, from the card's own, that stands apart from its cover and its
    // neighbours; failing that, the one apart from its cover that stands apart most.
    let index = start
    let bestGap = -1
    for (let step = 0; step < PASTEL_HUES.length; step++) {
      const candidate = (start + step) % PASTEL_HUES.length
      if (!contrastsWithCover(PASTEL_HUES[candidate], cover)) continue
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
  })
  return chosen
}

/**
 * A card's own pastel hue, for places that show one card on its own (e.g. link previews).
 * Pass the hue of its plain gradient cover, if it has one, to keep the backdrop apart from it.
 */
export function pastelHueFor(
  id: string,
  coverHue: number | null = null,
): number {
  const start = hash(id) % PASTEL_HUES.length
  for (let step = 0; step < PASTEL_HUES.length; step++) {
    const hue = PASTEL_HUES[(start + step) % PASTEL_HUES.length]
    if (contrastsWithCover(hue, coverHue)) return hue
  }
  return PASTEL_HUES[start]
}

/** OKLCH to an sRGB hex colour, for renderers without OKLCH support (e.g. Satori). */
export function oklchToHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return `#${linear
    .map((v) => {
      const srgb =
        v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055
      const byte = Math.round(Math.min(1, Math.max(0, srgb)) * 255)
      return byte.toString(16).padStart(2, "0")
    })
    .join("")}`
}

/** The two stops of `.card-pastel` (light theme) for a hue, as hex, for renderers without
 * OKLCH support. */
export function pastelStops(hue: number): { light: string; deep: string } {
  return {
    light: oklchToHex(0.88, 0.075, hue),
    deep: oklchToHex(0.82, 0.085, hue + 30),
  }
}
