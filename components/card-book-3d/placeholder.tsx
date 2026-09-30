"use client"

import { cn } from "@/lib/utils"
import type { CardBook3DProps } from "./card-book-3d"
import { ClosedCardCover } from "./closed-card-cover"
import { cardBookFrameClass } from "./frame"

/**
 * Shown on the server and while the 3D card's code loads: the closed card's cover, drawn
 * exactly where the 3D card will draw it, in a frame the same size as the real one, so nothing
 * moves or resizes when it takes over.
 */
export function CardBook3DPlaceholder({
  imageUrl,
  headline,
  recipientName,
  coverOnly = false,
  showPager = true,
  frameClassName,
  closedZoom,
  cornerRadius,
  renderPageEditor,
  className,
}: CardBook3DProps) {
  return (
    <div
      className={cn("flex w-full flex-col items-center gap-6", className)}
      aria-busy
    >
      <div
        className={cn(
          "relative w-full",
          frameClassName ??
            cardBookFrameClass(coverOnly, Boolean(renderPageEditor)),
        )}
      >
        <ClosedCardCover
          imageUrl={imageUrl || null}
          headline={headline}
          recipientName={recipientName}
          zoom={closedZoom}
          cornerRadius={cornerRadius}
        />
      </div>
      {/* Room for the pager underneath the real card. */}
      {showPager ? <div className="h-8" aria-hidden /> : null}
    </div>
  )
}
