/** Row shape returned from card_contributions (subset used by UI). */
export type ContributionRow = {
  id: string
  message: string
  created_at?: string
  is_creator?: boolean | null
  position_x?: number | null
  position_y?: number | null
  width_percent?: number | null
  page_index?: number | null
  font_size?: number | null
  /** Hex `#RRGGBB`; null uses theme text color */
  text_color?: string | null
}

/**
 * Creator copy lives on `card_contributions` (`is_creator`); `cards.copy_message` mirrors it.
 *
 * When a creator row exists, render it on the message canvas (position, width, font) like the
 * owner studio — not as the legacy centered `bodyMessage`, or contributors would see a
 * different layout than the author.
 *
 * Legacy cards without `is_creator` still use `fallbackCopyMessage` in the center and list
 * contributions as canvas notes only.
 */
export function forCardDisplay(
  contributions: ContributionRow[],
  fallbackCopyMessage: string,
) {
  const creator = contributions.find((c) => Boolean(c.is_creator))

  if (creator) {
    return {
      bodyMessage: '',
      displayContributions: contributions,
    }
  }

  return {
    bodyMessage: fallbackCopyMessage || '',
    displayContributions: contributions,
  }
}
