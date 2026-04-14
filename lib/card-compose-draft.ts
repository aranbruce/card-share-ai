/** Placed note before submit — owner studio and contribute flows share this shape. */
export type CardComposeDraft = {
  message: string
  x: number
  y: number
  pageIndex: number
  /** Note width on canvas; omit for default (75). */
  widthPercent?: number
  fontSize?: number
  /** Hex `#RRGGBB`; omit for theme default */
  textColor?: string | null
}
