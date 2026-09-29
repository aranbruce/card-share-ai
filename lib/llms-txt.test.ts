import { afterEach, describe, expect, it, vi } from "vitest"
import { ALL_CATEGORY_SLUGS } from "./category-pages"
import { ALL_COMPARE_SLUGS } from "./compare-pages"
import { buildLlmsTxt } from "./llms-txt"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("buildLlmsTxt", () => {
  it("links every occasion and comparison page with absolute URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.cardshare.ai")

    const txt = buildLlmsTxt()

    expect(txt.startsWith("# CardShare.ai\n")).toBe(true)
    for (const slug of ALL_CATEGORY_SLUGS) {
      expect(txt).toContain(`(https://www.cardshare.ai/browse/${slug})`)
    }
    for (const slug of ALL_COMPARE_SLUGS) {
      expect(txt).toContain(`(https://www.cardshare.ai/compare/${slug})`)
    }
  })
})
