import type { Card3DProps } from "./types"
import {
  hasLegacyUnindexedGuestContribution,
  maxContributionPageIndex,
} from "@/lib/card-extra-pages"

/**
 * A full card is a folded card: a cover, at least two inside pages (the first spread) and a
 * back. Inside pages come in pairs, one sheet at a time, so no spread has a blank side.
 */
const MIN_FULL_CARD_SPREAD_PAGES = 3

/** Pages (cover included) for a full card with at least `pages`: two or more inside, in pairs. */
export function fullCardPageCount(pages: number): number {
  const total = Math.max(MIN_FULL_CARD_SPREAD_PAGES, Math.trunc(pages))
  return total % 2 === 0 ? total + 1 : total
}

export type CommittedSpreadSnapshot = {
  totalPages: number
  extraPages: number
}

export type NaturalPageSpread = {
  lastContentPage: number
  totalPages: number
  validMessagePage: number
}

export function computeNaturalPageSpread(
  coverOnly: boolean,
  messagePageIndex: number,
  contributions: Card3DProps["contributions"],
  extraPages: number,
): NaturalPageSpread {
  const rows = contributions ?? []
  const safeExtraPages =
    Number.isFinite(extraPages) && extraPages >= 0 ? Math.trunc(extraPages) : 0
  const messagePageLowerBound = Math.max(1, messagePageIndex)
  const maxExplicitContributionPage = maxContributionPageIndex(rows)
  const hasLegacyUnindexedContribution =
    hasLegacyUnindexedGuestContribution(rows)

  let lastContentPage = Math.max(
    messagePageLowerBound,
    maxExplicitContributionPage,
    hasLegacyUnindexedContribution ? messagePageLowerBound + 1 : 0,
    1,
  )
  let totalPages = coverOnly ? 1 : lastContentPage + 1 + safeExtraPages

  let validMessagePage = coverOnly
    ? -1
    : Math.max(1, Math.min(messagePageIndex, totalPages - 1))

  if (!coverOnly && hasLegacyUnindexedContribution) {
    lastContentPage = Math.max(lastContentPage, validMessagePage + 1)
    totalPages = lastContentPage + 1 + safeExtraPages
    validMessagePage = Math.max(1, Math.min(messagePageIndex, totalPages - 1))
  }

  if (!coverOnly && totalPages !== fullCardPageCount(totalPages)) {
    totalPages = fullCardPageCount(totalPages)
    lastContentPage = Math.max(lastContentPage, 1)
    validMessagePage = Math.max(1, Math.min(messagePageIndex, totalPages - 1))
  }

  return { lastContentPage, totalPages, validMessagePage }
}

function floorFullCardSpreadPages(
  coverOnly: boolean,
  totalPages: number,
  validMessagePage: number,
): { totalPages: number; validMessagePage: number } {
  if (coverOnly || totalPages === fullCardPageCount(totalPages)) {
    return { totalPages, validMessagePage }
  }
  const pages = fullCardPageCount(totalPages)
  return {
    totalPages: pages,
    validMessagePage: Math.max(1, Math.min(validMessagePage, pages - 1)),
  }
}

export function capSpreadToCommitted(
  natural: NaturalPageSpread,
  committed: CommittedSpreadSnapshot | null,
  messagePageIndex: number,
  extraPages: number,
  coverOnly: boolean,
): { totalPages: number; validMessagePage: number } {
  if (coverOnly) {
    return floorFullCardSpreadPages(
      true,
      natural.totalPages,
      natural.validMessagePage,
    )
  }

  const useCommittedTotal =
    committed &&
    committed.extraPages === extraPages &&
    natural.totalPages > committed.totalPages &&
    natural.lastContentPage <= committed.totalPages - 1

  if (useCommittedTotal) {
    const totalPages = committed.totalPages
    const validMessagePage = Math.max(
      1,
      Math.min(messagePageIndex, totalPages - 1),
    )
    return floorFullCardSpreadPages(false, totalPages, validMessagePage)
  }

  return floorFullCardSpreadPages(
    false,
    natural.totalPages,
    natural.validMessagePage,
  )
}
