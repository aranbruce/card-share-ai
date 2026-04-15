import { describe, expect, it } from "vitest"

import { normalizeContributionTextColor } from "./contribution-text-color"

describe("normalizeContributionTextColor", () => {
  it("preserves undefined and null semantics", () => {
    expect(normalizeContributionTextColor(undefined)).toBeUndefined()
    expect(normalizeContributionTextColor(null)).toBeNull()
  })

  it("treats blank strings as clear requests", () => {
    expect(normalizeContributionTextColor("")).toBeNull()
    expect(normalizeContributionTextColor("   ")).toBeNull()
  })

  it("accepts #RRGGBB values and preserves input case", () => {
    expect(normalizeContributionTextColor("#A1B2C3")).toBe("#A1B2C3")
    expect(normalizeContributionTextColor("#a1b2c3")).toBe("#a1b2c3")
  })

  it("rejects values that do not match #RRGGBB", () => {
    expect(normalizeContributionTextColor("A1B2C3")).toBeUndefined()
    expect(normalizeContributionTextColor("#ABC")).toBeUndefined()
    expect(normalizeContributionTextColor("#A1B2C3FF")).toBeUndefined()
    expect(normalizeContributionTextColor(123)).toBeUndefined()
  })
})
