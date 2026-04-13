/** Validates `#RRGGBB`; `null`/empty clears; `undefined` means omit. */
export function normalizeContributionTextColor(
  val: unknown,
): string | null | undefined {
  if (val === undefined) return undefined
  if (val === null) return null
  if (typeof val !== "string") return undefined
  const t = val.trim()
  if (t === "") return null
  return /^#[0-9A-Fa-f]{6}$/.test(t) ? t : undefined
}
