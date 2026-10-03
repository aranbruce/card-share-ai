import { describe, expect, it } from "vitest"
import { ASSISTANT_PAGES, loomEmbedUrl } from "@/lib/assistant-pages"

describe("loomEmbedUrl", () => {
  const id = "0123456789abcdef0123456789abcdef"

  it("turns a Loom share link into its embed URL", () => {
    expect(loomEmbedUrl(`https://www.loom.com/share/${id}`)).toBe(
      `https://www.loom.com/embed/${id}`,
    )
    expect(loomEmbedUrl(`https://loom.com/share/${id}?sid=abc`)).toBe(
      `https://www.loom.com/embed/${id}`,
    )
  })

  it("ignores anything else", () => {
    expect(loomEmbedUrl(null)).toBeNull()
    expect(loomEmbedUrl("https://example.com/share/" + id)).toBeNull()
    expect(loomEmbedUrl("https://www.loom.com/share/not-an-id")).toBeNull()
  })
})

describe("ASSISTANT_PAGES", () => {
  it("has a page per assistant at its own path", () => {
    expect(ASSISTANT_PAGES.claude.path).toBe("/claude")
    expect(ASSISTANT_PAGES.chatgpt.path).toBe("/chatgpt")
    for (const page of Object.values(ASSISTANT_PAGES)) {
      expect(page.steps.length).toBeGreaterThan(0)
      expect(page.cta.href).toMatch(/^https:\/\//)
    }
  })
})
