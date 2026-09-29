import { describe, expect, it } from "vitest"
import { ALL_CATEGORY_SLUGS } from "../category-pages"
import { CARD_MESSAGES, countMessages } from "."

const pages = Object.values(CARD_MESSAGES)

describe("card message pages", () => {
  it("has a page for every occasion, and only for occasions", () => {
    expect(Object.keys(CARD_MESSAGES).sort()).toEqual(
      [...ALL_CATEGORY_SLUGS].sort(),
    )
  })

  it.each(pages)("$slug has sound metadata", (page) => {
    expect(`${page.metaTitle} | CardShare.ai`.length).toBeLessThanOrEqual(70)
    expect(page.metaDescription.length).toBeLessThanOrEqual(170)
    expect(Number.isNaN(Date.parse(page.lastModified))).toBe(false)
    // "40+" / "50+" in the description must be true.
    const claimed = page.metaDescription.match(/(\d+)\+/)
    if (claimed) {
      expect(countMessages(page)).toBeGreaterThanOrEqual(Number(claimed[1]))
    }
  })

  it.each(pages)("$slug has unique, well-formed messages", (page) => {
    const messages = page.groups.flatMap((g) => g.messages)
    expect(new Set(messages).size).toBe(messages.length)
    for (const message of messages) {
      expect(message.trim()).toBe(message)
      expect(message.endsWith(".")).toBe(false)
    }
  })

  it.each(pages)("$slug keeps to house style and real features", (page) => {
    // No en or em dashes anywhere.
    expect(JSON.stringify(page)).not.toMatch(/[–—]/)
    // Messages may joke about schedules; the page's own copy about the product may not.
    const productCopy = JSON.stringify([page.intro, page.tips, page.faqs])
    expect(productCopy.toLowerCase()).not.toMatch(
      /schedul|paid plan|\bpremium\b|\bprint(ed|ing|able)?\b|\bdownload/,
    )
  })
})
