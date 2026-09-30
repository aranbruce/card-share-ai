import { afterEach, describe, expect, it, vi } from "vitest"
import { AI_CRAWLERS, buildRobots, DISALLOWED_PATHS } from "./robots-rules"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("buildRobots", () => {
  it("allows everyone, including AI crawlers, in production", () => {
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.cardshare.ai")

    const robots = buildRobots()

    expect(robots.sitemap).toBe("https://www.cardshare.ai/sitemap.xml")
    expect(robots.rules).toEqual([
      { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOWED_PATHS },
    ])
  })

  it("keeps private card links out for every crawler", () => {
    vi.stubEnv("VERCEL_ENV", "production")

    for (const rule of [buildRobots().rules].flat()) {
      expect(rule.disallow).toContain("/view/")
      expect(rule.disallow).toContain("/contribute/")
    }
  })

  it("blocks all crawling on preview deployments", () => {
    vi.stubEnv("VERCEL_ENV", "preview")

    expect(buildRobots()).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    })
  })
})
