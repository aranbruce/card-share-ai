import { describe, expect, it } from "vitest"
import { buildPageMetadata } from "./site-metadata"

describe("buildPageMetadata", () => {
  it("leaves robots out so pages inherit the root layout's setting", () => {
    expect(buildPageMetadata({ title: "Home", path: "/" })).not.toHaveProperty(
      "robots",
    )
  })

  it("passes robots through when a page sets it", () => {
    const robots = { index: false, follow: false }
    expect(buildPageMetadata({ title: "Private", robots }).robots).toEqual(
      robots,
    )
  })
})
