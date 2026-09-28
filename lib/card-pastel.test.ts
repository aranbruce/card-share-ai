import { describe, expect, it } from "vitest"
import { pastelHueFor } from "./card-pastel"

describe("card pastel", () => {
  it("is stable for a card", () => {
    expect(pastelHueFor("1944e2c6")).toBe(pastelHueFor("1944e2c6"))
  })

  it("varies across cards", () => {
    const hues = new Set(
      Array.from({ length: 40 }, (_, i) => pastelHueFor(`card-${i}`)),
    )
    expect(hues.size).toBeGreaterThan(4)
  })
})
