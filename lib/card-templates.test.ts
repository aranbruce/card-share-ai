import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { CARD_TEMPLATES, templatesForOccasion } from "@/lib/card-templates"

const ids = (occasion: string) =>
  templatesForOccasion(occasion).map((t) => t.id)
const anyCard = CARD_TEMPLATES.filter((t) => t.occasions === "all").map(
  (t) => t.id,
)

describe("templatesForOccasion", () => {
  it("lists an occasion's own scenes, then the ones for any card", () => {
    const own = CARD_TEMPLATES.filter(
      (t) => t.occasions !== "all" && t.occasions.includes("birthday"),
    ).map((t) => t.id)
    expect(own.length).toBeGreaterThan(0)
    expect(ids("birthday")).toEqual([...own, ...anyCard])
  })

  it("keeps occasion-only scenes off other occasions", () => {
    expect(ids("thank_you")).not.toContain("moon-cake")
  })

  it("offers every template for custom cards", () => {
    expect(ids("custom")).toHaveLength(CARD_TEMPLATES.length)
  })

  it("offers no templates for sympathy cards", () => {
    expect(ids("sympathy")).toEqual([])
  })

  it("has a thumbnail file for every template", () => {
    for (const t of CARD_TEMPLATES) {
      expect(existsSync(`public${t.thumbnail}`), t.thumbnail).toBe(true)
    }
  })
})
