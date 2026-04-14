import type { CardComposeDraft } from "@/lib/card-compose-draft"
import type { ReactNode } from "react"

export interface Card3DProps {
  imageUrl: string
  headline: string
  message: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  contributions?: Array<{
    id: string
    message: string
    position_x?: number | null
    position_y?: number | null
    width_percent?: number | null
    page_index?: number | null
    font_size?: number | null
    /** Hex `#RRGGBB`; null/omit = theme default */
    text_color?: string | null
    /** Slight tilt in degrees; null/omit = no rotation */
    rotation_degrees?: number | null
    is_creator?: boolean | null
  }>
  editable?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onAddPage?: () => void | Promise<void>
  extraPages?: number
  onRegenerateHeadline?: (prompt: string) => Promise<void>
  onRegenerateMessage?: (prompt: string) => Promise<void>
  /** Second arg is the current cover image URL (data or https) for refinement. */
  onRegenerateImage?: (prompt: string, sourceImageUrl?: string) => Promise<void>
  isRegeneratingHeadline?: boolean
  isRegeneratingMessage?: boolean
  isRegeneratingImage?: boolean
  messageFontSize?: number
  onMessageFontSizeChange?: (size: number) => void
  /** Center inner message text color (preview / when no contribution row). */
  messageTextColor?: string | null
  onMessageTextColorChange?: (hex: string | null) => void
  messagePageIndex?: number
  onMessagePageIndexChange?: (page: number) => void
  /** Initial spread page when the card mounts (0 = cover). */
  initialPage?: number
  /** Only the cover page (no inner message / pagination) — e.g. create flow before save. */
  coverOnly?: boolean
  /**
   * Hide the legacy centered “card body” editor when it would be empty and unused
   * (canvas notes / compose flow only). Keeps the cover editable via `editable`.
   */
  hideEmptyCenterMessageBody?: boolean
  /** Rendered above card content. Use a function to read `currentPage` (0 = cover). */
  contributeOverlay?: ReactNode | ((ctx: { currentPage: number }) => ReactNode)
  /** Increment after a successful contribution submit to flip to the messages page. */
  contributeSubmitNonce?: number
  /** IDs of contributions this visitor may drag/edit (must match secrets they received when posting). */
  editableContributionIds?: string[]
  /** Fired when an editable contribution’s message changes (blur on InlineEdit). */
  onContributionEdit?: (contributionId: string, value: string) => void
  onContributionLayoutChange?: (
    contributionId: string,
    layout: {
      x: number
      y: number
      widthPercent: number
      pageIndex: number
      fontSize?: number
      textColor?: string | null
      rotationDegrees?: number | null
    },
  ) => void
  onContributionRegenerateMessage?: (
    contributionId: string,
    prompt: string,
  ) => Promise<void>
  contributionRegeneratingId?: string | null
  /** Extra blank page slot for new canvas notes (contribute flow). */
  composePageBump?: number
  composeDraft?: CardComposeDraft | null
  onComposeDraftChange?: (patch: Partial<CardComposeDraft>) => void
  /** Click on the card canvas to place a new note (offset matches the click overlay / placement area). */
  onComposeCanvasPlace?: (pt: {
    x: number
    y: number
    pageIndex: number
  }) => void
  onComposeSubmit?: () => void
  onComposeCancel?: () => void
  composeSubmitting?: boolean
  composeError?: string | null
  onComposeDraftRegenerateMessage?: (prompt: string) => Promise<void>
  composeDraftRegenerating?: boolean
}
