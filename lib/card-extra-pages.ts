import type { Contribution } from "@/lib/card-body"
import {
  toFiniteLayoutNumber,
  toLayoutPageIndex,
} from "@/lib/contribution-layout"

type ContributionPageFields = Pick<Contribution, "page_index" | "is_creator">

/** Guest rows saved before `page_index` existed; spread logic places them past page 1. */
export function hasLegacyUnindexedGuestContribution(
  contributions: ContributionPageFields[],
): boolean {
  return contributions.some(
    (c) => toFiniteLayoutNumber(c.page_index) === null && !c.is_creator,
  )
}

/** Highest spread index with an explicit `page_index` (0 = cover). */
export function maxContributionPageIndex(
  contributions: ContributionPageFields[],
): number {
  return contributions.reduce((max, c) => {
    const page = toLayoutPageIndex(c.page_index)
    if (page !== null) {
      return Math.max(max, page)
    }
    return max
  }, 0)
}

/** True when `extra_pages` only reserves blank spreads with no notes on page 2+. */
export function hasUnusedStoredExtraPages(
  storedExtraPages: number,
  contributions: ContributionPageFields[],
): boolean {
  if (storedExtraPages <= 0) return false
  if (hasLegacyUnindexedGuestContribution(contributions)) return false
  return maxContributionPageIndex(contributions) < 2
}
