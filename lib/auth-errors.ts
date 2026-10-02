/** Map Supabase Auth errors to short, user-facing copy (rate limits, etc.). */
export function friendlyAuthError(message: string, status?: number): string {
  const m = message.toLowerCase()
  if (
    status === 429 ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    /\b429\b/.test(m)
  ) {
    return "Too many attempts. Please wait a few minutes and try again."
  }
  return message
}
