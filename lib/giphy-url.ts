const GIPHY_HOST = "giphy.com"

/**
 * Accept only HTTPS URLs on Giphy CDN asset hosts (media*.giphy.com).
 * Page URLs (giphy.com/gifs/...) are rejected as they are not image assets.
 * Returns:
 * - string: normalized URL
 * - null: no value / clear (raw is null, undefined, or blank string)
 * - undefined: invalid value (wrong type, bad URL, non-HTTPS, non-CDN host)
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
  if (parsed.username || parsed.password) return undefined
  if (parsed.port) return undefined
  const host = parsed.hostname.toLowerCase()
  if (!host.endsWith(`.${GIPHY_HOST}`)) return undefined
  const subdomain = host.slice(0, host.length - GIPHY_HOST.length - 1)
  if (!/^media\d*$/.test(subdomain)) return undefined

  return parsed.toString()
}
