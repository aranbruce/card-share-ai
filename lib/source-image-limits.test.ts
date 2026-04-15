import { describe, expect, it } from "vitest"

import {
  MAX_SOURCE_IMAGE_BASE64_CHARS,
  isDataUrlSourceImageTooLargeForRequest,
  looksLikeDataUrl,
  sourceImageUrlForRefineRequest,
} from "./source-image-limits"

describe("source-image-limits", () => {
  describe("looksLikeDataUrl", () => {
    it("detects data urls after trimming", () => {
      expect(looksLikeDataUrl("data:image/png;base64,abc")).toBe(true)
      expect(looksLikeDataUrl("   data:image/png;base64,abc")).toBe(true)
      expect(looksLikeDataUrl("https://example.com/a.png")).toBe(false)
    })
  })

  describe("isDataUrlSourceImageTooLargeForRequest", () => {
    it("returns false for non-data urls", () => {
      expect(isDataUrlSourceImageTooLargeForRequest("https://example.com/a.png")).toBe(
        false,
      )
    })

    it("flags malformed or empty data urls as too large/invalid", () => {
      expect(isDataUrlSourceImageTooLargeForRequest("data:image/png;base64")).toBe(true)
      expect(isDataUrlSourceImageTooLargeForRequest("data:image/png;base64,   ")).toBe(
        true,
      )
    })

    it("enforces max base64 payload length", () => {
      const underLimit = `data:image/png;base64,${"A".repeat(
        MAX_SOURCE_IMAGE_BASE64_CHARS,
      )}`
      const overLimit = `data:image/png;base64,${"A".repeat(
        MAX_SOURCE_IMAGE_BASE64_CHARS + 1,
      )}`

      expect(isDataUrlSourceImageTooLargeForRequest(underLimit)).toBe(false)
      expect(isDataUrlSourceImageTooLargeForRequest(overLimit)).toBe(true)
    })
  })

  describe("sourceImageUrlForRefineRequest", () => {
    it("normalizes missing or blank values to undefined", () => {
      expect(sourceImageUrlForRefineRequest(undefined)).toBeUndefined()
      expect(sourceImageUrlForRefineRequest(null)).toBeUndefined()
      expect(sourceImageUrlForRefineRequest("   ")).toBeUndefined()
    })

    it("returns trimmed values unless an oversized data url is provided", () => {
      expect(sourceImageUrlForRefineRequest("  https://example.com/a.png ")).toBe(
        "https://example.com/a.png",
      )

      const oversized = `data:image/png;base64,${"A".repeat(
        MAX_SOURCE_IMAGE_BASE64_CHARS + 1,
      )}`
      expect(sourceImageUrlForRefineRequest(oversized)).toBeUndefined()
    })
  })
})
