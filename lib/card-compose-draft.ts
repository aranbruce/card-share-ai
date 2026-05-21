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
