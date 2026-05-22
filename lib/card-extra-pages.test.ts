import { describe, expect, it } from "vitest"

import {
  hasLegacyUnindexedGuestContribution,
  hasUnusedStoredExtraPages,
  maxContributionPageIndex,
  ownerExtraPagesForStudio,
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

  it("coerces string page_index from the API", () => {
    const rows: Contribution[] = [
      {
        id: "guest",
        message: "Hi",
        created_at: "2024-01-01T00:00:00.000Z",
        page_index: "2" as unknown as number,
      },
    ]
    expect(maxContributionPageIndex(rows)).toBe(2)
    expect(hasUnusedStoredExtraPages(1, rows)).toBe(false)
  })

  it("treats negative guest page_index as unindexed for trim decisions", () => {
    const rows: Contribution[] = [
      {
        id: "guest",
        message: "Hi!",
        created_at: "2024-01-01T00:00:00.000Z",
        page_index: -1,
      },
    ]
    expect(hasLegacyUnindexedGuestContribution(rows)).toBe(true)
    expect(hasUnusedStoredExtraPages(1, rows)).toBe(false)
  })

  it("does not trim when legacy guest rows omit page_index", () => {
    const rows: Contribution[] = [
      {
        id: "guest",
        message: "Hi!",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]
    expect(hasLegacyUnindexedGuestContribution(rows)).toBe(true)
    expect(hasUnusedStoredExtraPages(1, rows)).toBe(false)
  })

  it("ownerExtraPagesForStudio keeps stored extra_pages when contributions fail to load", () => {
    expect(
      ownerExtraPagesForStudio(2, [], false),
    ).toEqual({
      displayExtraPages: 2,
      unusedExtraPagesDetected: false,
    })
  })

  it("ownerExtraPagesForStudio trims display but flags unused when loaded", () => {
    const rows: Contribution[] = [
      {
        id: "creator",
        message: null,
        created_at: "2024-01-01T00:00:00.000Z",
        is_creator: true,
        page_index: 1,
      },
    ]
    expect(ownerExtraPagesForStudio(1, rows, true)).toEqual({
      displayExtraPages: 0,
      unusedExtraPagesDetected: true,
    })
  })

  it("ignores unindexed creator rows (compose pre-place)", () => {
    const rows: Contribution[] = [
      {
        id: "creator",
        message: null,
        created_at: "2024-01-01T00:00:00.000Z",
        is_creator: true,
        page_index: null,
      },
    ]
    expect(hasLegacyUnindexedGuestContribution(rows)).toBe(false)
    expect(hasUnusedStoredExtraPages(1, rows)).toBe(true)
  })
})
