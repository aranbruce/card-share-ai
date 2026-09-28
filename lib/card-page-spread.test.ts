import { describe, expect, it } from "vitest"

import {
  capSpreadToCommitted,
  computeNaturalPageSpread,
  fullCardPageCount,
} from "@/components/card-3d/card-page-spread"
import type { Contribution } from "@/lib/card-body"

function creatorRow(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "creator",
    message: null,
    created_at: "2024-01-01T00:00:00.000Z",
    is_creator: true,
    page_index: null,
    position_x: null,
    position_y: null,
    ...overrides,
  }
}

describe("computeNaturalPageSpread", () => {
  it("uses cover + two inside pages for an unplaced creator note", () => {
    const spread = computeNaturalPageSpread(false, 1, [creatorRow()], 0)
    expect(spread.totalPages).toBe(3)
    expect(spread.lastContentPage).toBe(1)
    expect(spread.validMessagePage).toBe(1)
  })

  it("never returns fewer than cover + two inside pages for a full card", () => {
    const capped = capSpreadToCommitted(
      { lastContentPage: 0, totalPages: 1, validMessagePage: 1 },
      { totalPages: 1, extraPages: 0 },
      1,
      0,
      false,
    )
    expect(capped.totalPages).toBe(3)
  })

  it("drops a previously committed spread when the natural page count shrinks", () => {
    const natural = computeNaturalPageSpread(false, 1, [creatorRow()], 0)
    const capped = capSpreadToCommitted(
      natural,
      { totalPages: 5, extraPages: 2 },
      1,
      0,
      false,
    )
    expect(capped.totalPages).toBe(3)
  })

  it("keeps inside pages in pairs, so no spread has a blank side", () => {
    const note = (page: number): Contribution => ({
      id: `n${page}`,
      message: "Hi",
      created_at: "2024-01-01T00:00:00.000Z",
      page_index: page,
      position_x: 10,
      position_y: 10,
    })
    // A note on page 3 needs a fourth inside page to finish the sheet.
    expect(computeNaturalPageSpread(false, 1, [note(3)], 0).totalPages).toBe(5)
    expect(computeNaturalPageSpread(false, 1, [note(2)], 0).totalPages).toBe(3)
  })

  it("adds a whole sheet for each pair of extra pages", () => {
    const rows = [creatorRow()]
    expect(computeNaturalPageSpread(false, 1, rows, 2).totalPages).toBe(5)
    expect(computeNaturalPageSpread(false, 1, rows, 4).totalPages).toBe(7)
    // Odd counts stored before pages came in pairs still round up to a whole sheet.
    expect(computeNaturalPageSpread(false, 1, rows, 1).totalPages).toBe(3)
    expect(computeNaturalPageSpread(false, 1, rows, 3).totalPages).toBe(5)
  })

  it("leaves a cover-only card at one page", () => {
    expect(computeNaturalPageSpread(true, 1, [], 0).totalPages).toBe(1)
  })

  it("still reserves an extra page for legacy guest rows without page_index", () => {
    const guest: Contribution = {
      id: "guest",
      message: "Hi!",
      created_at: "2024-01-01T00:00:00.000Z",
    }
    const spread = computeNaturalPageSpread(false, 1, [guest], 0)
    expect(spread.totalPages).toBe(3)
    expect(spread.lastContentPage).toBe(2)
  })
})

describe("fullCardPageCount", () => {
  it("is at least cover + two inside pages, with inside pages in pairs", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(fullCardPageCount)).toEqual([
      3, 3, 3, 5, 5, 7, 7,
    ])
  })
})
