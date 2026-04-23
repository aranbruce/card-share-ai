import type { Card3DProps } from "./types"

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
    if (typeof c.page_index === "number" && c.page_index >= 0) {
      return Math.max(max, c.page_index)
    }
    return max
  }, 0)
  const hasLegacyUnindexedContribution = rows.some(
    (c) => !(typeof c.page_index === "number" && c.page_index >= 0),
  )

  let lastContentPage = Math.max(
    messagePageLowerBound,
    maxExplicitContributionPage,
    hasLegacyUnindexedContribution ? messagePageLowerBound + 1 : 0,
    1,
  )
  let totalPages = coverOnly
    ? 1
    : lastContentPage + 1 + extraPages

  let validMessagePage = coverOnly
    ? -1
    : Math.max(1, Math.min(messagePageIndex, totalPages - 1))

  if (!coverOnly && hasLegacyUnindexedContribution) {
    lastContentPage = Math.max(lastContentPage, validMessagePage + 1)
    totalPages = lastContentPage + 1 + extraPages
    validMessagePage = Math.max(1, Math.min(messagePageIndex, totalPages - 1))
  }

  return { lastContentPage, totalPages, validMessagePage }
}

export function capSpreadToCommitted(
  natural: NaturalPageSpread,
  committed: CommittedSpreadSnapshot | null,
  messagePageIndex: number,
  extraPages: number,
  coverOnly: boolean,
): { totalPages: number; validMessagePage: number } {
  if (coverOnly) {
    return {
      totalPages: natural.totalPages,
      validMessagePage: natural.validMessagePage,
    }
  }
  if (!committed || committed.extraPages !== extraPages) {
    return {
      totalPages: natural.totalPages,
      validMessagePage: natural.validMessagePage,
    }
  }
  if (natural.totalPages <= committed.totalPages) {
    return {
      totalPages: natural.totalPages,
      validMessagePage: natural.validMessagePage,
    }
  }
  if (natural.lastContentPage <= committed.totalPages - 1) {
    const totalPages = committed.totalPages
    const validMessagePage = Math.max(
      1,
      Math.min(messagePageIndex, totalPages - 1),
    )
    return { totalPages, validMessagePage }
  }
  return {
    totalPages: natural.totalPages,
    validMessagePage: natural.validMessagePage,
  }
}
