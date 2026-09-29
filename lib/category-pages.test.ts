import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  ALL_CATEGORY_SLUGS,
  BROWSE_CATEGORY_SLUGS,
  CATEGORY_CONFIGS,
} from "./category-pages"
import { COMPARE_CONFIGS } from "./compare-pages"

const publicFile = (src: string) => path.join(process.cwd(), "public", src)

describe("occasion pages", () => {
  it("lists every occasion on the browse page", () => {
    expect([...BROWSE_CATEGORY_SLUGS].sort()).toEqual(
      [...ALL_CATEGORY_SLUGS].sort(),
    )
  })

  it.each(Object.values(CATEGORY_CONFIGS))(
    "$slug has search-friendly metadata",
    (config) => {
      expect(CATEGORY_CONFIGS[config.slug]).toBe(config)
      // Longer titles and descriptions get cut off in search results.
      expect(`${config.metaTitle} | CardShare.ai`.length).toBeLessThanOrEqual(
        70,
      )
      expect(config.metaDescription.length).toBeLessThanOrEqual(200)
      expect(config.faqs.length).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(config.lastModified))).toBe(false)
    },
  )

  it.each(Object.values(CATEGORY_CONFIGS))(
    "$slug only points at cover art that exists",
    (config) => {
      const covers = [
        config.coverImage,
        ...config.uses.map((u) => u.coverImage),
      ]
      for (const cover of covers) {
        if (cover) expect(existsSync(publicFile(cover)), cover).toBe(true)
      }
    },
  )
})

describe("comparison pages", () => {
  it.each(Object.values(COMPARE_CONFIGS))(
    "$slug cites its sources and has metadata",
    (config) => {
      expect(COMPARE_CONFIGS[config.slug]).toBe(config)
      expect(config.sources.length).toBeGreaterThan(0)
      expect(`${config.metaTitle} | CardShare.ai`.length).toBeLessThanOrEqual(
        70,
      )
      expect(config.metaDescription.length).toBeLessThanOrEqual(200)
      expect(Number.isNaN(Date.parse(config.lastModified))).toBe(false)
    },
  )
})
