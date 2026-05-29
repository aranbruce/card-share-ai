const EMAIL_HEADER_VALUE_MAX_LENGTH = 200

export function sanitizeEmailHeaderValue(value: string): string {
  return value
    .trim()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, EMAIL_HEADER_VALUE_MAX_LENGTH)
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function assertSafeHttpUrl(link: string): string {
  let parsed: URL
  try {
    parsed = new URL(link)
  } catch {
    throw new Error("Invalid link URL")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid link URL")
  }
  return link
}
