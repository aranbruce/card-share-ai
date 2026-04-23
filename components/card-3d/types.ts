import type { Contribution } from "@/lib/card-body"
import type { CardComposeDraft } from "@/lib/card-compose-draft"
import type { ReactNode } from "react"

export interface Card3DProps {
  imageUrl: string
  headline: string
  message: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  /** Cover headline still loading (e.g. initial AI copy). */
  isGeneratingHeadline?: boolean
  contributions?: Contribution[]
  editable?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onAddPage?: () => void | Promise<void>
  extraPages?: number
  onRegenerateHeadline?: (prompt: string) => Promise<void>
  /** Second arg is the current cover image URL (data or https) for refinement. */
  onRegenerateImage?: (prompt: string, sourceImageUrl?: string) => Promise<void>
  isRegeneratingHeadline?: boolean
  isRegeneratingImage?: boolean
  messageFontSize?: number
  /** Center inner message text color (preview / when no contribution row). */
  messageTextColor?: string | null
  messagePageIndex?: number
  /** Initial spread page when the card mounts (0 = cover). */
  initialPage?: number
  /** Only the cover page (no inner message / pagination) — e.g. create flow before save. */
  coverOnly?: boolean
  /** Hide the inline sparkle regenerate button on the cover image (use when controls live in a sidebar). */
  hideImageRegenerateButton?: boolean
  /** Suppress the submit/cancel buttons rendered below the card for compose draft. */
  suppressComposeActions?: boolean
  /** Fire when an editable contribution gains or loses focus (null = blur). */
  onEditingContributionChange?: (id: string | null) => void
  /** Imperatively navigate to this page index (0 = cover). Effect fires when the value changes. */
  navigateToPage?: number
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
  onContributionGifChange?: (
    contributionId: string,
    giphyUrl: string | null,
  ) => void
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
  contributionRegeneratingId?: string | null
  composeDraft?: CardComposeDraft | null
  onComposeDraftChange?: (patch: Partial<CardComposeDraft>) => void
  /** Click on the card canvas to place a new note (offset matches the click overlay / placement area). */
  onComposeCanvasPlace?: (pt: {
    x: number
    y: number
    pageIndex: number
  }) => void
  onComposeDraftGifChange?: (giphyUrl: string | null) => void
  onComposeSubmit?: () => void
  onComposeCancel?: () => void
  composeSubmitting?: boolean
  composeError?: string | null
  onComposeDraftRegenerateMessage?: (prompt: string) => Promise<void>
  composeDraftRegenerating?: boolean
}
