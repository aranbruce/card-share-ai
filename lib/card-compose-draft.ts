import type { Contribution } from "@/lib/card-body"

/** Placed note before submit — owner studio and contribute flows share this shape. */
export type CardComposeDraft = {
  message: string
  /** Optional Giphy-hosted GIF URL for this draft note. */
  giphyUrl?: string | null
  x: number
  y: number
  pageIndex: number
  /** Note width on canvas; omit for default (75). */
  widthPercent?: number
  fontSize?: number
  /** Hex `#RRGGBB`; omit for theme default */
  textColor?: string | null
  /** Slight tilt in degrees; null/omit = no rotation */
  rotationDegrees?: number | null
  /** Preset slug; null/omit uses app default sans */
  fontFamily?: string | null
}

/** Id of the stand-in note that shows an unposted draft on the 3D card. */
export const COMPOSE_DRAFT_NOTE_ID = "compose-draft"

/**
 * An unposted draft as a note, so the 3D card can draw it on its page while nobody is
 * editing (e.g. after the phone keyboard is dismissed), just as it will look once posted.
 */
export function composeDraftAsContribution(
  draft: CardComposeDraft,
): Contribution {
  return {
    id: COMPOSE_DRAFT_NOTE_ID,
    message: draft.message,
    giphy_url: draft.giphyUrl ?? null,
    created_at: "",
    is_creator: false,
    position_x: draft.x,
    position_y: draft.y,
    width_percent: draft.widthPercent ?? 75,
    page_index: draft.pageIndex,
    font_size: draft.fontSize ?? null,
    text_color: draft.textColor ?? null,
    rotation_degrees: draft.rotationDegrees ?? null,
    font_family: draft.fontFamily ?? null,
  }
}
