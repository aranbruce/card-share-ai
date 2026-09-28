import { describe, expect, it } from "vitest"
import {
  oklchToHex,
  PASTEL_HUES,
  pastelHueFor,
  pastelHuesFor,
  pastelStops,
} from "./card-pastel"

/** UUID-like ids, as real cards have (a fixed sequence so the test is deterministic). */
const ids = (n: number) => {
  let seed = 12345
  return Array.from({ length: n }, () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return `${seed.toString(16).padStart(8, "0")}-5b18-4ba6-93e9-d7c38ad1872f`
  })
}

describe("card pastel", () => {
  it("is stable for the same list", () => {
    expect(pastelHuesFor(ids(9))).toEqual(pastelHuesFor(ids(9)))
  })

  it("keeps each card clearly apart from the three before it", () => {
    const hues = pastelHuesFor(ids(60))
    hues.forEach((hue, i) => {
      for (const other of hues.slice(Math.max(0, i - 3), i)) {
        const d = Math.abs(hue - other) % 360
        expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(25)
      }
    })
  })

  it("keeps each card's own colour when it has no close duplicate", () => {
    expect(pastelHuesFor(["only"])[0]).toBeOneOf([...PASTEL_HUES])
  })

  it("uses a wide range of colours", () => {
    expect(new Set(pastelHuesFor(ids(60))).size).toBeGreaterThan(9)
  })

  it("gives a single card one of the palette hues, the same every time", () => {
    for (const id of ids(20)) {
      expect(PASTEL_HUES).toContain(pastelHueFor(id))
      expect(pastelHueFor(id)).toBe(pastelHueFor(id))
    }
  })

  it("keeps each backdrop well clear of its card's plain cover", () => {
    const list = ids(60)
    const covers = list.map((_, i) => [18, 40, 70, 150, 310, 230, null][i % 7])
    const hues = pastelHuesFor(list, covers)
    hues.forEach((hue, i) => {
      const cover = covers[i]
      if (cover === null) return
      // The backdrop blends from its hue to 30° on; the cover must be 60° from all of it.
      for (let h = hue; h <= hue + 30; h += 5) {
        const d = Math.abs(h - cover) % 360
        expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(60)
      }
    })
  })

  it("still keeps neighbours apart when covers constrain the backdrops", () => {
    const hues = pastelHuesFor(ids(60), Array(60).fill(18))
    hues.forEach((hue, i) => {
      for (const other of hues.slice(Math.max(0, i - 3), i)) {
        const d = Math.abs(hue - other) % 360
        expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(25)
      }
    })
  })

  it("keeps a single card's backdrop clear of its plain cover", () => {
    for (const id of ids(20)) {
      const hue = pastelHueFor(id, 60)
      for (let h = hue; h <= hue + 30; h += 5) {
        const d = Math.abs(h - 60) % 360
        expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(60)
      }
    }
  })

  it("converts OKLCH to sRGB hex", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff")
    expect(oklchToHex(0, 0, 0)).toBe("#000000")
    expect(oklchToHex(0.62796, 0.25768, 29.2339)).toBe("#ff0000")
  })

  it("makes light pastel stops, deepening into the next hue", () => {
    const { light, deep } = pastelStops(18)
    const channels = (hex: string) =>
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    for (const hex of [light, deep]) {
      expect(Math.max(...channels(hex))).toBeGreaterThan(220)
      expect(Math.min(...channels(hex))).toBeGreaterThan(140)
    }
    const sum = (hex: string) => channels(hex).reduce((a, b) => a + b, 0)
    expect(sum(deep)).toBeLessThan(sum(light))
  })
})
