import { describe, expect, it } from "vitest"
import {
  parseAspectRatio,
  sizingForGenerateImage,
  DEFAULT_CARD_COVER_ASPECT_RATIO,
} from "./card-image-aspect"

describe("parseAspectRatio", () => {
  it("returns undefined for invalid input", () => {
    expect(parseAspectRatio(undefined)).toBeUndefined()
    expect(parseAspectRatio("")).toBeUndefined()
    expect(parseAspectRatio("2:1")).toBeUndefined()
    expect(parseAspectRatio("four:five")).toBeUndefined()
  })

  it("normalizes spacing and accepts allowlisted ratios", () => {
    expect(parseAspectRatio("  4 : 5  ")).toBe("4:5")
    expect(parseAspectRatio("16:9")).toBe("16:9")
  })
})

describe("sizingForGenerateImage", () => {
  it("passes aspect ratio through for gateway", () => {
    expect(sizingForGenerateImage("4:5", false)).toEqual({
      aspectRatio: "4:5",
    })
  })

  it("uses explicit size for fal when ratio is not natively mapped", () => {
    const out = sizingForGenerateImage("4:5", true)
    expect(out).toEqual({ size: "704x896" })
  })

  it("uses aspect ratio for fal when natively mapped", () => {
    expect(sizingForGenerateImage("3:4", true)).toEqual({ aspectRatio: "3:4" })
  })
})

describe("DEFAULT_CARD_COVER_ASPECT_RATIO", () => {
  it("is allowlisted", () => {
    expect(parseAspectRatio(DEFAULT_CARD_COVER_ASPECT_RATIO)).toBe("4:5")
  })
})
