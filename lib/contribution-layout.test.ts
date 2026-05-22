import { describe, expect, it } from "vitest"

import {
  contributionHasCanvasPosition,
  contributionPageIndex,
  toFiniteLayoutNumber,
} from "@/lib/contribution-layout"

describe("contribution-layout", () => {
  it("coerces string layout numbers from the API", () => {
    expect(toFiniteLayoutNumber("24")).toBe(24)
    expect(
      contributionHasCanvasPosition({ position_x: "12", position_y: "8" }),
    ).toBe(true)
    expect(contributionPageIndex({ page_index: "1" }, 0)).toBe(1)
  })

  it("treats missing positions as not placed", () => {
    expect(
      contributionHasCanvasPosition({ position_x: null, position_y: null }),
    ).toBe(false)
    expect(
      contributionHasCanvasPosition({
        position_x: undefined,
        position_y: undefined,
      }),
    ).toBe(false)
  })
})
