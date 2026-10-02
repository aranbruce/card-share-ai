"use client"

import type { ComponentProps } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useScrollEdgeFade } from "@/hooks/use-scroll-edge-fade"
import { cn } from "@/lib/utils"

type ScrollArrowsOptions = {
  /** Vertical placement, e.g. the middle of the tiles' images. */
  className?: string
  backLabel?: string
  forwardLabel?: string
}

/** Scrolls a carousel most of a page in one direction. */
export function scrollByPage(el: HTMLElement | null, direction: 1 | -1) {
  el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" })
}

/** Round previous/next button for a carousel; shown to mouse users only, touch users swipe. */
export function ScrollArrow({
  direction,
  label,
  onClick,
  className,
}: {
  direction: "back" | "forward"
  label: string
  onClick: () => void
  className?: string
}) {
  const Icon = direction === "back" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute hidden size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card pointer-fine:flex",
        direction === "back" ? "left-3" : "right-3",
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

/**
 * A horizontal scroller whose edges fade while there's more to scroll that way, with
 * optional previous/next arrows.
 */
export function EdgeFadeScroller({
  fadeWidth = "3rem",
  arrows,
  style,
  ...props
}: Omit<ComponentProps<"div">, "ref" | "onScroll"> & {
  fadeWidth?: string
  arrows?: ScrollArrowsOptions
}) {
  const { ref, onScroll, canScroll, maskStyle } =
    useScrollEdgeFade<HTMLDivElement>(fadeWidth)
  const scroller = (
    <div
      ref={ref}
      onScroll={onScroll}
      style={{ ...style, ...maskStyle }}
      {...props}
    />
  )
  if (!arrows) return scroller

  return (
    <div className="relative">
      {scroller}
      {canScroll.back && (
        <ScrollArrow
          direction="back"
          label={arrows.backLabel ?? "Previous"}
          onClick={() => scrollByPage(ref.current, -1)}
          className={arrows.className}
        />
      )}
      {canScroll.forward && (
        <ScrollArrow
          direction="forward"
          label={arrows.forwardLabel ?? "Next"}
          onClick={() => scrollByPage(ref.current, 1)}
          className={arrows.className}
        />
      )}
    </div>
  )
}
