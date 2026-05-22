import type { Contribution } from "@/lib/card-body"

/** Coerce Supabase/JSON layout numbers (may arrive as strings). */
export function toFiniteLayoutNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function contributionHasCanvasPosition(
  contribution: Pick<Contribution, "position_x" | "position_y">,
): boolean {
  return (
    toFiniteLayoutNumber(contribution.position_x) !== null &&
    toFiniteLayoutNumber(contribution.position_y) !== null
  )
}

export function contributionPageIndex(
  contribution: Pick<Contribution, "page_index">,
  fallback: number,
): number {
  const page = toFiniteLayoutNumber(contribution.page_index)
  if (page !== null && page >= 0) return page
  return fallback
}
