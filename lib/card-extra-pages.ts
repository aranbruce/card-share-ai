import type { LayoutNumberValue } from "@/lib/contribution-layout"
import { toLayoutPageIndex } from "@/lib/contribution-layout"

type ContributionPageFields = {
  page_index?: LayoutNumberValue
  is_creator?: boolean | null
}

/** Guest rows saved before `page_index` existed; spread logic places them past page 1. */
export function hasLegacyUnindexedGuestContribution(
  contributions: ContributionPageFields[],
): boolean {
  return contributions.some(
    (c) => toLayoutPageIndex(c.page_index) === null && !c.is_creator,
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

export function normalizeStoredExtraPages(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  return 0
}

/** Owner studio display + trim signal; does not mutate stored DB `extra_pages`. */
export function ownerExtraPagesForStudio(
  storedExtraPages: unknown,
  contributions: ContributionPageFields[],
  contributionsLoaded: boolean,
): {
  displayExtraPages: number
  unusedExtraPagesDetected: boolean
} {
  const stored = normalizeStoredExtraPages(storedExtraPages)
  if (!contributionsLoaded) {
    return { displayExtraPages: stored, unusedExtraPagesDetected: false }
  }
  const unusedExtraPagesDetected = hasUnusedStoredExtraPages(
    stored,
    contributions,
  )
  return {
    displayExtraPages: unusedExtraPagesDetected ? 0 : stored,
    unusedExtraPagesDetected,
  }
}
