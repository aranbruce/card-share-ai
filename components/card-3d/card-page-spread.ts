import type { Card3DProps } from "./types"
import { toLayoutPageIndex } from "@/lib/contribution-layout"

const MIN_FULL_CARD_SPREAD_PAGES = 2

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
  const messagePageLowerBound = Math.max(1, messagePageIndex)
  const maxExplicitContributionPage = rows.reduce((max, c) => {
    const page = toLayoutPageIndex(c.page_index)
    if (page !== null) {
      return Math.max(max, page)
    }
    return max
  }, 0)
  // Pre-place creator rows use page_index: null for compose mode — not legacy guests.
  const hasLegacyUnindexedContribution = rows.some(
    (c) => toLayoutPageIndex(c.page_index) === null && !c.is_creator,
  )

  let lastContentPage = Math.max(
    messagePageLowerBound,
    maxExplicitContributionPage,
    hasLegacyUnindexedContribution ? messagePageLowerBound + 1 : 0,
    1,
  )
  let totalPages = coverOnly ? 1 : lastContentPage + 1 + extraPages

  let validMessagePage = coverOnly
    ? -1
    : Math.max(1, Math.min(messagePageIndex, totalPages - 1))

  if (!coverOnly && hasLegacyUnindexedContribution) {
    lastContentPage = Math.max(lastContentPage, validMessagePage + 1)
    totalPages = lastContentPage + 1 + extraPages
    validMessagePage = Math.max(1, Math.min(messagePageIndex, totalPages - 1))
  }

  if (!coverOnly && totalPages < MIN_FULL_CARD_SPREAD_PAGES) {
    totalPages = MIN_FULL_CARD_SPREAD_PAGES
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
  if (coverOnly || totalPages >= MIN_FULL_CARD_SPREAD_PAGES) {
    return { totalPages, validMessagePage }
  }
  return {
    totalPages: MIN_FULL_CARD_SPREAD_PAGES,
    validMessagePage: Math.max(
      1,
      Math.min(validMessagePage, MIN_FULL_CARD_SPREAD_PAGES - 1),
    ),
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
  if (committed && natural.totalPages < committed.totalPages) {
    return floorFullCardSpreadPages(
      false,
      natural.totalPages,
      natural.validMessagePage,
    )
  }
  if (!committed || committed.extraPages !== extraPages) {
    return floorFullCardSpreadPages(
      false,
      natural.totalPages,
      natural.validMessagePage,
    )
  }
  if (natural.totalPages <= committed.totalPages) {
    return floorFullCardSpreadPages(
      false,
      natural.totalPages,
      natural.validMessagePage,
    )
  }
  if (natural.lastContentPage <= committed.totalPages - 1) {
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
