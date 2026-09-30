import Image from "next/image"
import type { CSSProperties } from "react"
import { looksLikeDataUrl } from "@/lib/source-image-limits"

/**
 * Dashboard thumbnail drawn as a standing greeting card with CSS 3D transforms.
 * The grid can hold dozens of cards, more than browsers allow WebGL contexts, so this mirrors
 * the Three.js card's look (tilted card stock, page edges, glossy cover) without a canvas.
 * On hover (inside a `group`) the cover swings open to peek at the inside.
 */
export function CardThumb3D({
  imageUrl,
  headline,
  alt,
  hue,
  priority = false,
  cardHeight = 74,
  cardOffsetY = 4,
  rotate = 0,
}: {
  imageUrl: string | null
  headline: string | null
  alt: string
  /** Fallback cover gradient hue when there is no image. */
  hue: number
  priority?: boolean
  /** The standing card's height, as a percentage of the container's. */
  cardHeight?: number
  /** Moves the card down from the centre, as a percentage of its own height. */
  cardOffsetY?: number
  /** Turns the card in the picture's plane, in degrees (e.g. to vary a row of cards). */
  rotate?: number
}) {
  // The ground shadow sits just under the card's bottom edge.
  const cardBottom = 50 - cardHeight / 2 - (cardOffsetY * cardHeight) / 100
  const shadowBottom = `${cardBottom - 2}%`
  const fallbackCover: CSSProperties = {
    background: `linear-gradient(135deg, oklch(0.9 0.08 ${hue}) 0%, oklch(0.78 0.13 ${hue - 15}) 100%)`,
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center perspective-[1100px]">
      {/* Ground shadow */}
      <div
        aria-hidden
        className="absolute h-[6%] w-[62%] rounded-[50%] bg-black/25 blur-md transition-all duration-500 group-hover:w-[70%] motion-reduce:transition-none"
        style={{ bottom: shadowBottom }}
      />
      <div
        className="relative aspect-4/5 rotate-x-6 -rotate-y-18 transition-transform duration-500 ease-out transform-3d group-hover:rotate-x-3 group-hover:-rotate-y-8 motion-reduce:transition-none"
        style={{
          height: `${cardHeight}%`,
          translate: `0 ${cardOffsetY}%`,
          rotate: rotate ? `${rotate}deg` : undefined,
        }}
      >
        {/* Inside page, visible when the cover swings open */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[3px] bg-linear-to-br from-amber-50 to-orange-50 shadow-md"
          style={{ transform: "translateZ(-4px)" }}
        >
          <div className="absolute inset-x-[14%] top-[22%] space-y-[9%]">
            <div className="h-[3px] w-4/5 rounded-full bg-stone-300/70" />
            <div className="h-[3px] w-full rounded-full bg-stone-300/70" />
            <div className="h-[3px] w-3/5 rounded-full bg-stone-300/70" />
          </div>
        </div>
        {/* Card stock showing between cover and inside page */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[3px] bg-[#efe6d4]"
          style={{ transform: "translateZ(-2px)" }}
        />
        {/* Cover: hinged on the spine (left edge) */}
        <div className="absolute inset-0 origin-left overflow-hidden rounded-[3px] shadow-lg transition-transform duration-500 ease-out backface-hidden group-hover:-rotate-y-28 motion-reduce:transition-none">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={alt}
              fill
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 26vw"
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              unoptimized={looksLikeDataUrl(imageUrl)}
              className="object-cover"
            />
          ) : (
            <div className="size-full" style={fallbackCover} />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          {/* Gloss that shifts as the card turns on hover */}
          <div className="absolute inset-0 bg-linear-to-br from-white/25 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
          {headline ? (
            <div className="absolute inset-x-0 bottom-0 card-preview-headline-inset text-center text-white">
              <p className="card-preview-headline font-bold">{headline}</p>
            </div>
          ) : null}
          {/* Crease along the spine */}
          <div className="absolute inset-y-0 left-0 w-[6%] bg-linear-to-r from-black/20 to-transparent" />
        </div>
      </div>
    </div>
  )
}
