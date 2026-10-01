import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
} from "@/components/card-book-3d/page-painter"
import { contributionHasCanvasPosition } from "@/lib/contribution-layout"

type SignatureRow = {
  message?: string | null
  giphy_url?: string | null
}

/** Everyone who has written a note or added a GIF, the card's author included. */
export function countSignatures(rows: readonly SignatureRow[]): number {
  return rows.filter((row) => row.message?.trim() || row.giphy_url).length
}

/** Matches the studio: notes are placed at 75% of the page width. */
const NOTE_WIDTH_PERCENT = 75
/** Matches `COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX` in components/card-3d/draggable-wrapper. */
const NOTE_ESTIMATE_HEIGHT_PX = 108
/** The inside page the author's note sits on (the page after the cover). */
const MESSAGE_PAGE_INDEX = 1

/**
 * Where the author's note goes when they write it from an AI assistant before
 * placing it in the studio: centred on the message page, as if they'd tapped there.
 * A creator note without a position isn't drawn on the card at all.
 */
export const DEFAULT_CREATOR_NOTE_LAYOUT = {
  position_x: Math.round(
    (PAGE_WIDTH_PX - (PAGE_WIDTH_PX * NOTE_WIDTH_PERCENT) / 100) / 2,
  ),
  position_y: Math.round((PAGE_HEIGHT_PX - NOTE_ESTIMATE_HEIGHT_PX) / 2),
  width_percent: NOTE_WIDTH_PERCENT,
  page_index: MESSAGE_PAGE_INDEX,
} as const

type CreatorNoteRow = {
  position_x?: number | string | null
  position_y?: number | string | null
}

/** The update for the author's note: the new text, plus a position if it has none yet. Empty text clears it. */
export function creatorNoteUpdate(
  existing: CreatorNoteRow | null,
  message: string | null,
): Record<string, unknown> {
  // Clearing the note leaves it where it is, or unplaced
  if (!message) return { message: null }
  const placed = existing ? contributionHasCanvasPosition(existing) : false
  return placed ? { message } : { message, ...DEFAULT_CREATOR_NOTE_LAYOUT }
}
