import { Buffer } from "node:buffer"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./https-source-image")

import { fetchHttpsSourceImageBytes } from "./https-source-image"
import {
  MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH,
  MAX_SOURCE_IMAGE_BASE64_CHARS,
} from "./source-image-limits"
import { resolveImageForModel } from "./resolve-image-for-model"

const mockFetch = vi.mocked(fetchHttpsSourceImageBytes)

const TINY_B64 = Buffer.from("hello").toString("base64")

function dataUrl(mime: string, b64: string) {
  return `data:${mime};base64,${b64}`
}

beforeEach(() => vi.clearAllMocks())

describe("resolveImageForModel", () => {
  describe("empty / whitespace input", () => {
    it("returns null for empty string", async () => {
      expect(await resolveImageForModel("")).toBeNull()
    })

    it("returns null for whitespace-only string", async () => {
      expect(await resolveImageForModel("   \t\n")).toBeNull()
    })
  })

  describe("data: URL branch", () => {
    it("returns null when there is no comma", async () => {
      expect(await resolveImageForModel("data:image/png;base64")).toBeNull()
    })

    it("returns null for non-image MIME types", async () => {
      expect(await resolveImageForModel(dataUrl("text/plain", TINY_B64))).toBeNull()
      expect(await resolveImageForModel(dataUrl("application/json", TINY_B64))).toBeNull()
      expect(await resolveImageForModel(dataUrl("video/mp4", TINY_B64))).toBeNull()
    })

    it("returns null when ;base64 is absent (plain data URL)", async () => {
      expect(await resolveImageForModel("data:image/svg+xml,<svg/>")).toBeNull()
      expect(await resolveImageForModel("data:image/png;utf8," + TINY_B64)).toBeNull()
    })

    it("returns null for an empty base64 payload (zero decoded bytes)", async () => {
      expect(await resolveImageForModel("data:image/png;base64,")).toBeNull()
    })

    it("returns bytes for a valid image data URL", async () => {
      const result = await resolveImageForModel(dataUrl("image/png", TINY_B64))
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result!.length).toBeGreaterThan(0)
    })

    it("accepts image/jpeg, image/gif, and image/webp", async () => {
      for (const mime of ["image/jpeg", "image/gif", "image/webp"]) {
        expect(await resolveImageForModel(dataUrl(mime, TINY_B64))).toBeInstanceOf(Uint8Array)
      }
    })

    it("is case-insensitive for the MIME type and ;base64 token", async () => {
      expect(
        await resolveImageForModel(`data:IMAGE/PNG;BASE64,${TINY_B64}`),
      ).toBeInstanceOf(Uint8Array)
    })

    it("trims surrounding whitespace from the raw input", async () => {
      const result = await resolveImageForModel(`  ${dataUrl("image/png", TINY_B64)}  `)
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it("returns null when the base64 payload exceeds MAX_SOURCE_IMAGE_BASE64_CHARS", async () => {
      const oversized = dataUrl("image/png", "A".repeat(MAX_SOURCE_IMAGE_BASE64_CHARS + 1))
      expect(await resolveImageForModel(oversized)).toBeNull()
    })
  })

  describe("https:// URL branch", () => {
    const VALID_URL = "https://example.supabase.co/storage/v1/object/photo.jpg"

    it("returns bytes on a successful fetch", async () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff])
      mockFetch.mockResolvedValueOnce({ ok: true, bytes })

      const result = await resolveImageForModel(VALID_URL)
      expect(result).toBe(bytes)
      expect(mockFetch).toHaveBeenCalledWith(VALID_URL)
    })

    it("returns null when the fetch returns an error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, message: "Not allowed" })
      expect(await resolveImageForModel(VALID_URL)).toBeNull()
    })

    it("returns null and skips fetch for URLs exceeding MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH", async () => {
      const tooLong = "https://example.com/" + "a".repeat(MAX_HTTPS_SOURCE_IMAGE_URL_LENGTH)
      expect(await resolveImageForModel(tooLong)).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("disallowed schemes", () => {
    it.each([
      "http://example.com/image.jpg",
      "ftp://example.com/image.jpg",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "blob:https://example.com/abc-123",
    ])("returns null for %s", async (url) => {
      expect(await resolveImageForModel(url)).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
