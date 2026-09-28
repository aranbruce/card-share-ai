import { describe, expect, it } from "vitest"
import {
  isAllowedCoverUrl,
  loadPreviewCover,
  sniffPreviewImageType,
} from "./card-preview-cover"

describe("card preview cover", () => {
  it("detects drawable image types from their bytes", () => {
    expect(
      sniffPreviewImageType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png")
    expect(sniffPreviewImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(
      "image/jpeg",
    )
    expect(
      sniffPreviewImageType(
        new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
      ),
    ).toBe("image/gif")
    // RIFF....WEBP
    expect(
      sniffPreviewImageType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBeNull()
  })

  it("only fetches covers from Supabase storage over https", () => {
    const supabase = "https://abc.example.com"
    expect(
      isAllowedCoverUrl(
        "https://xyz.supabase.co/storage/v1/object/public/card-images/a.png",
        supabase,
      ),
    ).toBe(true)
    expect(isAllowedCoverUrl("https://abc.example.com/a.png", supabase)).toBe(
      true,
    )
    expect(isAllowedCoverUrl("http://xyz.supabase.co/a.png", supabase)).toBe(
      false,
    )
    expect(isAllowedCoverUrl("https://169.254.169.254/", supabase)).toBe(false)
    expect(
      isAllowedCoverUrl("https://supabase.co.evil.com/a.png", supabase),
    ).toBe(false)
    expect(isAllowedCoverUrl("not a url", supabase)).toBe(false)
  })

  it("passes drawable data URLs through and skips others", async () => {
    expect(await loadPreviewCover("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA",
    )
    expect(await loadPreviewCover("data:image/webp;base64,AAAA")).toBeNull()
    expect(await loadPreviewCover("")).toBeNull()
    expect(await loadPreviewCover(null)).toBeNull()
    expect(await loadPreviewCover("https://example.org/a.png")).toBeNull()
  })
})
