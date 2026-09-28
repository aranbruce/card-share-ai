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

  it("converts OKLCH to sRGB hex", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff")
    expect(oklchToHex(0, 0, 0)).toBe("#000000")
    expect(oklchToHex(0.62796, 0.25768, 29.2339)).toBe("#ff0000")
  })

  it("makes light pastel stops", () => {
    const { light, deep } = pastelStops(32)
    for (const hex of [light, deep]) {
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      expect(Math.min(...channels)).toBeGreaterThan(200)
    }
  })
})
