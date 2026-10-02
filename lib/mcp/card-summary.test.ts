import { describe, expect, it } from "vitest"
import { formatCardText, summarizeCard } from "@/lib/mcp/card-summary"

const APP = "https://cardshare.ai"

const row = {
  id: "card-1",
  card_type: "thank_you",
  recipient_name: "Sarah",
  sender_name: "The design team",
  copy_headline: "Sarah, thank you for every single year",
  image_url: "https://example.supabase.co/storage/v1/object/public/cover.png",
  contributor_link_id: "link-1",
  sent_at: null,
  created_at: "2026-10-01T10:00:00Z",
}

describe("summarizeCard", () => {
  it("builds the edit, invite and view links", () => {
    const card = summarizeCard(APP, row)
    expect(card.editUrl).toBe(`${APP}/dashboard/cards/card-1`)
    expect(card.contributeUrl).toBe(`${APP}/contribute/link-1`)
    expect(card.viewUrl).toBe(`${APP}/view/link-1`)
    expect(card.previewImageUrl).toMatch(
      new RegExp(`^${APP}/og/card/link-1\\?for=view&v=`),
    )
    expect(card.status).toBe("collecting")
    expect(card).not.toHaveProperty("signedCount")
  })

  it("marks sent cards and keeps the message count", () => {
    const card = summarizeCard(
      APP,
      { ...row, sent_at: "2026-10-02T09:00:00Z" },
      3,
    )
    expect(card.status).toBe("sent")
    expect(card.signedCount).toBe(3)
  })

  it("drops covers that aren't https and links without a link id", () => {
    const card = summarizeCard(APP, {
      id: "card-2",
      image_url: "data:image/png;base64,abc",
      contributor_link_id: null,
    })
    expect(card.coverImageUrl).toBeNull()
    expect(card.contributeUrl).toBeNull()
    expect(card.viewUrl).toBeNull()
    expect(card.previewImageUrl).toBeNull()
    expect(card.cardType).toBe("custom")
  })
})

describe("formatCardText", () => {
  it("includes the headline and links", () => {
    const text = formatCardText(summarizeCard(APP, row, 2))
    expect(text).toContain("Card for Sarah from The design team (thank you)")
    expect(text).toContain('Headline: "Sarah, thank you for every single year"')
    expect(text).toContain("Signed by: 2")
    expect(text).toContain("Your message: (not written yet)")
    expect(text).toContain(`Invite others to sign: ${APP}/contribute/link-1`)
  })
})
