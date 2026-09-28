import { describe, expect, it } from "vitest"
import { PASTEL_HUES, pastelHuesFor } from "./card-pastel"

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
})
