import { describe, expect, it } from "vitest"
import {
  cardPreviewImagePath,
  cardPreviewVersion,
  parseCardPreviewVariant,
} from "./card-preview"

const card = {
  recipient_name: "Sam",
  sender_name: "Aran",
  copy_headline: "Happy Birthday Sam",
  image_url: "https://x.supabase.co/a.png",
}

describe("card preview", () => {
  it("changes version when what the preview shows changes", () => {
    expect(cardPreviewVersion(card)).toBe(cardPreviewVersion({ ...card }))
    expect(cardPreviewVersion(card)).not.toBe(
      cardPreviewVersion({ ...card, copy_headline: "Happy Birthday!" }),
    )
    expect(cardPreviewVersion(card)).not.toBe(
      cardPreviewVersion({ ...card, image_url: "https://x.supabase.co/b.png" }),
    )
  })

  it("builds the image path for a link", () => {
    const path = cardPreviewImagePath("link-1", "contribute", card)
    expect(path).toMatch(/^\/og\/card\/link-1\?for=contribute&v=[0-9a-z]+$/)
  })

  it("defaults to the view variant", () => {
    expect(parseCardPreviewVariant("contribute")).toBe("contribute")
    expect(parseCardPreviewVariant("view")).toBe("view")
    expect(parseCardPreviewVariant(null)).toBe("view")
    expect(parseCardPreviewVariant("other")).toBe("view")
  })
})
