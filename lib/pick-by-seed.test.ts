import { describe, expect, it } from "vitest"
import { pickBySeed } from "./pick-by-seed"

describe("pickBySeed", () => {
  const options = ["a", "b", "c", "d"] as const

  it("always picks the same option for the same seed", () => {
    expect(pickBySeed("card-123", options)).toBe(
      pickBySeed("card-123", options),
    )
  })

  it("spreads different seeds across every option", () => {
    const picked = new Set(
      Array.from({ length: 200 }, (_, i) => pickBySeed(`link-${i}`, options)),
    )
    expect(picked).toEqual(new Set(options))
  })

  it("returns the only option when there is one", () => {
    expect(pickBySeed("anything", ["only"])).toBe("only")
  })

  it("throws without options", () => {
    expect(() => pickBySeed("seed", [])).toThrow()
  })
})
