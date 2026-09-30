"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { closedCardCss, PAGE_H, PAGE_W } from "@/lib/card-book-pose"
import { cn } from "@/lib/utils"
import { PAGE_HEIGHT_PX } from "./page-painter"

const { perspective, unitCss, rotation } = closedCardCss

/** Scene units (page width = 1) as a CSS length. */
function scene(units: number): string {
  return `calc(${units.toFixed(5)} * var(--card-unit))`
}

/** A length on the card, given in the painter's page px (the page is 560 tall). */
function pagePx(px: number): string {
  return scene((px * PAGE_H) / PAGE_HEIGHT_PX)
}

/** Images already shown once, so a second copy (e.g. after the 3D code loads) skips the fade. */
const shownImages = new Set<string>()

/**
 * The closed card's cover, drawn in plain HTML and CSS 3D exactly where the 3D card's camera
 * draws it (same perspective, size and title layout), with its soft shadow on the table.
 * Needs no JavaScript to place (it is right in server-rendered HTML), so it shows from the
 * first paint while the 3D card loads and until its first frame is ready, and the hand-over
 * is seamless. Fills its positioned parent, which must be the 3D card's frame.
 */
export function ClosedCardCover({
  imageUrl,
  headline,
  recipientName,
  zoom = 1,
  cornerRadius = 0,
  coverBackground,
  shimmer = false,
  children,
  className,
}: {
  imageUrl?: string | null
  headline: string
  recipientName: string
  /** Matches the 3D card's `closedZoom` (the camera's closer, so the card is larger). */
  zoom?: number
  /** Matches the 3D card's `cornerRadius` (fore-edge corners, in page widths). */
  cornerRadius?: number
  /** Cover fill when there is no image (defaults to the 3D card's fallback cover). */
  coverBackground?: string
  /** Sweeps a shimmer across the cover (e.g. while it is being made). */
  shimmer?: boolean
  /** Drawn on the cover in place of the title (e.g. a prompt before the card exists). */
  children?: ReactNode
  className?: string
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(() =>
    imageUrl && shownImages.has(imageUrl) ? imageUrl : null,
  )
  const imageLoaded = Boolean(imageUrl) && loadedUrl === imageUrl
  const markLoaded = () => {
    if (!imageUrl) return
    shownImages.add(imageUrl)
    setLoadedUrl(imageUrl)
  }

  const plane: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transformStyle: "preserve-3d",
  }

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={
        {
          containerType: "size",
          "--card-unit": unitCss,
          transform: zoom === 1 ? undefined : `scale(${zoom})`,
        } as CSSProperties
      }
    >
      {/* Container units resolve against an ancestor, so the camera sits one level in. */}
      <div
        className="absolute inset-0"
        style={{
          perspective: `${perspective.toFixed(4)}cqh`,
          perspectiveOrigin: "50% 50%",
        }}
      >
        {/* The 3D card's shadow: a blurred rectangle a little larger than the page, under it. */}
        <div
          style={{
            ...plane,
            width: scene(PAGE_W * 1.16),
            height: scene(PAGE_H * 1.12),
            transform: `translate(-50%, -50%) ${rotation} translate3d(0, ${scene(0.02)}, ${scene(-0.04)})`,
          }}
        >
          <div
            className="absolute bg-black/35"
            style={{ inset: "8%", filter: `blur(${pagePx(6)})` }}
          />
        </div>

        <div
          className="overflow-hidden"
          style={{
            ...plane,
            width: scene(PAGE_W),
            height: scene(PAGE_H),
            transform: `translate(-50%, -50%) ${rotation}`,
            borderRadius: cornerRadius
              ? `0 ${scene(cornerRadius)} ${scene(cornerRadius)} 0`
              : undefined,
            // The 3D card's fallback cover when there is no image; a quiet paper tone while
            // the image loads.
            background: imageUrl
              ? "#e7e0d4"
              : (coverBackground ??
                "linear-gradient(135deg, #f59e0b, #b45309)"),
          }}
        >
          {imageUrl ? (
            <>
              {imageLoaded ? null : (
                <div className="ai-refine-shimmer-sweep-cover absolute inset-0 opacity-60 motion-reduce:hidden" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- drawn in CSS 3D; may be a data URL */}
              <img
                src={imageUrl}
                alt=""
                // Same request mode as the 3D card's texture, so the image is fetched once.
                crossOrigin={
                  imageUrl.startsWith("data:") ? undefined : "anonymous"
                }
                decoding="async"
                onLoad={markLoaded}
                ref={(img) => {
                  // Loaded before hydration: onLoad fired before React was listening.
                  if (img?.complete && img.naturalWidth > 0 && !imageLoaded) {
                    markLoaded()
                  }
                }}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
                  imageLoaded ? "opacity-100" : "opacity-0",
                )}
              />
            </>
          ) : null}
          {shimmer ? (
            <div className="ai-refine-shimmer-sweep-cover absolute inset-0 motion-reduce:hidden" />
          ) : null}
          {children ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
              style={{ padding: pagePx(24) }}
            >
              {children}
            </div>
          ) : (
            /* Matches the 3D card's cover painter: fade, title and "For …". */
            <div
              className="absolute inset-0 flex flex-col items-center justify-end bg-linear-to-t from-black/80 via-black/20 to-transparent text-center text-white"
              style={{ padding: pagePx(24) }}
            >
              {headline.trim() ? (
                <p
                  className="font-bold"
                  style={{
                    fontSize: pagePx(30),
                    lineHeight: 1.25,
                    marginBottom: pagePx(8),
                  }}
                >
                  {headline.trim()}
                </p>
              ) : null}
              <p
                className="opacity-80"
                style={{ fontSize: pagePx(14), lineHeight: pagePx(20) }}
              >
                For {recipientName}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
