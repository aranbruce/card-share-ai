import { describe, expect, it } from "vitest"

import {
  capSpreadToCommitted,
  computeNaturalPageSpread,
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
  it("uses cover + one inside page for an unplaced creator note", () => {
    const spread = computeNaturalPageSpread(false, 1, [creatorRow()], 0)
    expect(spread.totalPages).toBe(2)
    expect(spread.lastContentPage).toBe(1)
    expect(spread.validMessagePage).toBe(1)
  })

  it("never returns fewer than cover + one inside page for a full card", () => {
    const capped = capSpreadToCommitted(
      { lastContentPage: 0, totalPages: 1, validMessagePage: 1 },
      { totalPages: 1, extraPages: 0 },
      1,
      0,
      false,
    )
    expect(capped.totalPages).toBe(2)
  })

  it("drops a previously committed spread when the natural page count shrinks", () => {
    const natural = computeNaturalPageSpread(false, 1, [creatorRow()], 0)
    const capped = capSpreadToCommitted(
      natural,
      { totalPages: 3, extraPages: 1 },
      1,
      0,
      false,
    )
    expect(capped.totalPages).toBe(2)
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
