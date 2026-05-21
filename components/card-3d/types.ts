import type { Contribution } from "@/lib/card-body"
import type { CardComposeDraft } from "@/lib/card-compose-draft"
import type { ReactNode } from "react"

// ── Core — required on every usage ───────────────────────────────────────────

type Card3DCoreProps = {
  imageUrl: string
  headline: string
  message: string
  senderName: string
  recipientName: string
  contributions?: Contribution[]
  extraPages?: number
  onAddPage?: () => void | Promise<void>
  /** Initial spread page when the card mounts (0 = cover). */
  initialPage?: number
  /** Imperatively navigate to this page index (0 = cover). Effect fires when the value changes. */
  navigateToPage?: number
  /** Rendered above card content. Use a function to read `currentPage` (0 = cover). */
  contributeOverlay?: ReactNode | ((ctx: { currentPage: number }) => ReactNode)
  /** Increment after a successful contribution submit to flip to the messages page. */
  contributeSubmitNonce?: number
}

// ── Headline / image editing (only meaningful with editable=true) ─────────────

type Card3DHeadlineEditProps = {
  /** Enable inline headline and message editing on the card itself. */
  editable?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  isRegeneratingHeadline?: boolean
  isRegeneratingImage?: boolean
  /** Cover headline still loading (e.g. initial AI copy). */
  isGeneratingHeadline?: boolean
  isGeneratingImage?: boolean
  messageFontSize?: number
  /** Center inner message text color (preview / when no contribution row). */
  messageTextColor?: string | null
  messagePageIndex?: number
  /** Only the cover page (no inner message / pagination) — e.g. create flow before save. */
  coverOnly?: boolean
}

// ── Contribution overlay editing ─────────────────────────────────────────────

type Card3DContributionEditProps = {
  /** IDs of contributions this visitor may drag/edit (must match secrets they received when posting). */
  editableContributionIds?: string[]
  /** Fire when an editable contribution gains or loses focus (null = blur). */
  onEditingContributionChange?: (id: string | null) => void
  /** Fired when an editable contribution's message changes (blur on InlineEdit). */
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
}

// ── Compose draft (guest contribution flow) ───────────────────────────────────

export type Card3DComposeDraftProps = {
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
  /** Suppress the submit/cancel buttons rendered below the card for compose draft. */
  suppressComposeActions?: boolean
}

// ── Combined ──────────────────────────────────────────────────────────────────

export type Card3DProps = Card3DCoreProps &
  Card3DHeadlineEditProps &
  Card3DContributionEditProps &
  Card3DComposeDraftProps
