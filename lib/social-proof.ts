/** A stat stays hidden until it reaches this, so small early numbers never show publicly. */
export const SOCIAL_PROOF_MIN_COUNT = 100

export type SiteStats = {
  /** Every card created. */
  cards: number | null
  /** Notes added by signers (the creator's own message is not counted). */
  notes: number | null
}

export type StatItem = { value: string; label: string }

/**
 * Rounds down to a friendly figure ("150+", "1,200+", "12,000+") so the copy never overstates
 * and stays stable between hourly refreshes. Returns null below the public threshold.
 */
export function formatProofCount(
  count: number | null | undefined,
  min = SOCIAL_PROOF_MIN_COUNT,
): string | null {
  if (count == null || !Number.isFinite(count) || count < min) return null
  const step = count < 1_000 ? 10 : count < 10_000 ? 100 : 1_000
  const rounded = Math.floor(count / step) * step
  return `${rounded.toLocaleString("en-US")}+`
}

/** The stats that pass the threshold, in display order. */
export function buildStatItems(stats: SiteStats | null): StatItem[] {
  if (!stats) return []
  const items: StatItem[] = []
  const cards = formatProofCount(stats.cards)
  if (cards) items.push({ value: cards, label: "cards created" })
  const notes = formatProofCount(stats.notes)
  if (notes) items.push({ value: notes, label: "notes signed" })
  return items
}

/** Card-level proof on the signing page: how many people have already added a note. */
export function signerCountLine(signerCount: number): string {
  if (signerCount <= 0) return "Be the first to sign"
  if (signerCount === 1) return "1 person has signed so far"
  return `${signerCount.toLocaleString("en-US")} people have signed so far`
}
