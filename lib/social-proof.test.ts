import { describe, expect, it } from "vitest"
import {
  buildStatItems,
  formatProofCount,
  signerCountLine,
  SOCIAL_PROOF_MIN_COUNT,
} from "./social-proof"
import { testimonialsFor } from "./testimonials"

describe("formatProofCount", () => {
  it("hides counts below the threshold or missing", () => {
    expect(formatProofCount(null)).toBeNull()
    expect(formatProofCount(undefined)).toBeNull()
    expect(formatProofCount(Number.NaN)).toBeNull()
    expect(formatProofCount(SOCIAL_PROOF_MIN_COUNT - 1)).toBeNull()
  })

  it("rounds down so the copy never overstates", () => {
    expect(formatProofCount(100)).toBe("100+")
    expect(formatProofCount(157)).toBe("150+")
    expect(formatProofCount(999)).toBe("990+")
    expect(formatProofCount(1_234)).toBe("1,200+")
    expect(formatProofCount(12_345)).toBe("12,000+")
  })

  it("respects a custom threshold", () => {
    expect(formatProofCount(500, 1_000)).toBeNull()
    expect(formatProofCount(12, 10)).toBe("10+")
  })
})

describe("buildStatItems", () => {
  it("returns nothing without stats", () => {
    expect(buildStatItems(null)).toEqual([])
    expect(buildStatItems({ cards: 20, notes: 40 })).toEqual([])
  })

  it("keeps only the stats that pass the threshold", () => {
    expect(buildStatItems({ cards: 50, notes: 480 })).toEqual([
      { value: "480+", label: "notes signed" },
    ])
    expect(buildStatItems({ cards: 1_050, notes: null })).toEqual([
      { value: "1,000+", label: "cards created" },
    ])
  })
})

describe("signerCountLine", () => {
  it("invites the first signer and pluralises", () => {
    expect(signerCountLine(0)).toBe("Be the first to sign")
    expect(signerCountLine(1)).toBe("1 person has signed so far")
    expect(signerCountLine(1_200)).toBe("1,200 people have signed so far")
  })
})

describe("testimonialsFor", () => {
  const all = [
    { quote: "a", name: "A", occasion: "birthday" },
    { quote: "b", name: "B" },
    { quote: "c", name: "C", occasion: "farewell" },
    { quote: "d", name: "D" },
  ]

  it("puts matching occasion quotes first, then general ones", () => {
    expect(testimonialsFor("birthday", 3, all).map((t) => t.name)).toEqual([
      "A",
      "B",
      "D",
    ])
  })

  it("uses only general quotes without an occasion", () => {
    expect(testimonialsFor(undefined, 3, all).map((t) => t.name)).toEqual([
      "B",
      "D",
    ])
  })

  it("renders nothing while the list is empty", () => {
    expect(testimonialsFor("birthday")).toEqual([])
  })
})
