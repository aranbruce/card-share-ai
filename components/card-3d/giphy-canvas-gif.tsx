"use client"

import { cn } from "@/lib/utils"

/**
 * Renders a Giphy GIF on the card canvas at its natural aspect ratio, scaled to fit
 * the note width and a max height so very tall GIFs do not dominate the page.
 */
export function GiphyCanvasGif({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    // Giphy CDN URLs; plain <img> avoids Next/Image remote-domain edge cases for animated GIFs.
    // eslint-disable-next-line @next/next/no-img-element -- intentional for Giphy GIF playback on canvas
    <img
      src={src}
      alt={alt}
      className={cn(
        "mx-auto block h-auto max-h-[min(40vh,280px)] w-auto max-w-full object-contain",
        className,
      )}
      loading="lazy"
      decoding="async"
    />
  )
}
