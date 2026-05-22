import { describe, expect, it } from "vitest"

import {
  hasUnusedStoredExtraPages,
  maxContributionPageIndex,
} from "@/lib/card-extra-pages"
import type { Contribution } from "@/lib/card-body"

describe("card-extra-pages", () => {
  it("detects unused stored extra pages when nothing is on page 2+", () => {
    const rows: Contribution[] = [
      {
        id: "creator",
        message: null,
        created_at: "2024-01-01T00:00:00.000Z",
        is_creator: true,
        page_index: 1,
      },
    ]
    expect(maxContributionPageIndex(rows)).toBe(1)
    expect(hasUnusedStoredExtraPages(1, rows)).toBe(true)
  })

  it("keeps stored extra pages when a note is on page 2+", () => {
    const rows: Contribution[] = [
      {
        id: "guest",
        message: "Hi",
        created_at: "2024-01-01T00:00:00.000Z",
        page_index: 2,
      },
    ]
    expect(hasUnusedStoredExtraPages(1, rows)).toBe(false)
  })
})
