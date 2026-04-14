/**
 * Removes one layer of matching straight or curly quotes wrapping the whole string.
 */
export function stripSurroundingQuotes(raw: string): string {
  let s = raw.trim()
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ["\u201c", "\u201d"],
    ["\u2018", "\u2019"],
  ]
  for (const [open, close] of pairs) {
    if (s.length >= 2 && s.startsWith(open) && s.endsWith(close)) {
      s = s.slice(open.length, -close.length).trim()
      break
    }
  }
  return s
}
