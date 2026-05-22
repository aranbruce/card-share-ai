import { describe, expect, it } from "vitest"

import type { Contribution } from "@/lib/card-body"

import {
  contributionHasCanvasPosition,
  contributionPageIndex,
  normalizeContributionFromApi,
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

  it("normalizes string layout fields on API rows", () => {
    const row: Contribution = {
      id: "a",
      message: "Hi",
      created_at: "2024-01-01T00:00:00.000Z",
      position_x: "12" as unknown as number,
      position_y: "24" as unknown as number,
      page_index: "2" as unknown as number,
      width_percent: "75" as unknown as number,
      font_size: "18" as unknown as number,
      rotation_degrees: "3" as unknown as number,
    }
    expect(normalizeContributionFromApi(row)).toEqual({
      ...row,
      position_x: 12,
      position_y: 24,
      page_index: 2,
      width_percent: 75,
      font_size: 18,
      rotation_degrees: 3,
    })
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
