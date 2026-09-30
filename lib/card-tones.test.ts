import { describe, expect, it } from "vitest"
import { CARD_TONES, getToneDefinition, resolveCardTone } from "./card-tones"

describe("resolveCardTone", () => {
  it("resolves current tones in any case", () => {
    expect(resolveCardTone("dad jokes")).toBe("Dad jokes")
    expect(resolveCardTone(" HYPE ")).toBe("Hype")
  })

  it("maps legacy tones", () => {
    expect(resolveCardTone("Warm")).toBe("Heartfelt")
    expect(resolveCardTone("Sincere")).toBe("Heartfelt")
    expect(resolveCardTone("Short")).toBe("Heartfelt")
    expect(resolveCardTone("Playful")).toBe("Hype")
    expect(resolveCardTone("Sassy")).toBe("Roast")
    expect(resolveCardTone("Dry")).toBe("Roast")
  })

  it("returns null for unknown or missing tones", () => {
    expect(resolveCardTone("Mysterious")).toBeNull()
    expect(resolveCardTone("")).toBeNull()
    expect(resolveCardTone(undefined)).toBeNull()
  })
})

describe("getToneDefinition", () => {
  it("defines every offered tone", () => {
    for (const tone of CARD_TONES) {
      const definition = getToneDefinition(tone)
      expect(definition?.headlineExamples.length).toBeGreaterThan(0)
      expect(definition?.imageMood).toBeTruthy()
    }
  })
})
