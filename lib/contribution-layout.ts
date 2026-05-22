import type { Contribution } from "@/lib/card-body"

/** Layout numeric fields as returned from Supabase/JSON (may arrive as strings). */
export type LayoutNumberValue = number | string | null | undefined

export type ContributionLayoutFields = {
  position_x?: LayoutNumberValue
  position_y?: LayoutNumberValue
  page_index?: LayoutNumberValue
  width_percent?: LayoutNumberValue
  font_size?: LayoutNumberValue
  rotation_degrees?: LayoutNumberValue
}

function normalizeLayoutField(
  value: LayoutNumberValue,
): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return toFiniteLayoutNumber(value)
}

/** Coerce API layout numbers before storing contributions in client state. */
export function normalizeContributionFromApi(row: Contribution): Contribution {
  return {
    ...row,
    position_x: normalizeLayoutField(row.position_x),
    position_y: normalizeLayoutField(row.position_y),
    width_percent: normalizeLayoutField(row.width_percent),
    page_index: normalizeLayoutField(row.page_index),
    font_size: normalizeLayoutField(row.font_size),
    rotation_degrees: normalizeLayoutField(row.rotation_degrees),
  }
}

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
  contribution: Pick<ContributionLayoutFields, "position_x" | "position_y">,
): boolean {
  return (
    toFiniteLayoutNumber(contribution.position_x) !== null &&
    toFiniteLayoutNumber(contribution.position_y) !== null
  )
}

export function contributionPageIndex(
  contribution: Pick<ContributionLayoutFields, "page_index">,
  fallback: number,
): number {
  const page = toFiniteLayoutNumber(contribution.page_index)
  if (page !== null && page >= 0) return page
  return fallback
}
