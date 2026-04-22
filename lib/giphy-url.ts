const GIPHY_HOST = "giphy.com"

/**
 * Accept only HTTPS URLs hosted on giphy domains.
 * Returns:
 * - string: normalized URL
 * - null: no value / clear (raw is null, undefined, or blank string)
 * - undefined: invalid value (wrong type, bad URL, non-HTTPS, non-giphy host)
 */
export function normalizeGiphyUrl(raw: unknown): string | null | undefined {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== "string") return undefined

  const trimmed = raw.trim()
  if (!trimmed) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return undefined
  }

  if (parsed.protocol !== "https:") return undefined
  const host = parsed.hostname.toLowerCase()
  if (host !== GIPHY_HOST && !host.endsWith(`.${GIPHY_HOST}`)) {
    return undefined
  }

  return parsed.toString()
}
