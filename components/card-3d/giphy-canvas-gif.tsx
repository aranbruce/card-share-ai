"use client"

import { cn } from "@/lib/utils"

/** Renders a Giphy GIF on the card canvas. Uses `<img>` so CDN URLs always load (Next/Image remote config not required). */
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
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
      decoding="async"
    />
  )
}
