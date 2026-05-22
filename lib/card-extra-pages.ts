import type { Contribution } from "@/lib/card-body"

/** Highest spread index with an explicit `page_index` (0 = cover). */
export function maxContributionPageIndex(
  contributions: Pick<Contribution, "page_index">[],
): number {
  return contributions.reduce((max, c) => {
    if (typeof c.page_index === "number" && c.page_index >= 0) {
      return Math.max(max, c.page_index)
    }
    return max
  }, 0)
}

/** True when `extra_pages` only reserves blank spreads with no notes on page 2+. */
export function hasUnusedStoredExtraPages(
  storedExtraPages: number,
  contributions: Pick<Contribution, "page_index">[],
): boolean {
  return storedExtraPages > 0 && maxContributionPageIndex(contributions) < 2
}
