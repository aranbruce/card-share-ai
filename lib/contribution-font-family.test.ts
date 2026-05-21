import { describe, expect, it } from "vitest"
import { normalizeContributionFontFamily } from "@/lib/contribution-font-family"

describe("normalizeContributionFontFamily", () => {
  it("returns undefined when omitted", () => {
    expect(normalizeContributionFontFamily(undefined)).toBeUndefined()
  })

  it("clears to null for null, empty, or default", () => {
    expect(normalizeContributionFontFamily(null)).toBeNull()
    expect(normalizeContributionFontFamily("")).toBeNull()
    expect(normalizeContributionFontFamily("default")).toBeNull()
    expect(normalizeContributionFontFamily("  default  ")).toBeNull()
  })

  it("accepts whitelisted preset slugs", () => {
    expect(normalizeContributionFontFamily("caveat")).toBe("caveat")
    expect(normalizeContributionFontFamily("dancing-script")).toBe(
      "dancing-script",
    )
  })

  it("rejects unknown slugs and non-strings", () => {
    expect(normalizeContributionFontFamily("comic-sans")).toBeUndefined()
    expect(normalizeContributionFontFamily(42)).toBeUndefined()
    expect(normalizeContributionFontFamily({})).toBeUndefined()
  })
})
