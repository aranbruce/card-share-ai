"use client"

import { lazy, Suspense, useSyncExternalStore, type ComponentType } from "react"
import { cn } from "@/lib/utils"
import type { CardBook3DProps } from "./card-book-3d"
import { ClosedCardCover } from "./closed-card-cover"
import { cardBookFrameClass } from "./frame"

/** Past this, a slow or stalled download shows the flat card rather than waiting on. */
const LOAD_TIMEOUT_MS = 20_000

/** Stands in when the 3D card's code cannot be loaded (e.g. a stale chunk after a deploy). */
function CardBook3DUnavailable({ fallback = null }: CardBook3DProps) {
  return <>{fallback}</>
}

type Loaded = { default: ComponentType<CardBook3DProps> }

let loading: Promise<Loaded> | null = null
/** Loads the 3D card's code once, falling back to the flat card on failure or timeout. */
function loadCardBook3D(): Promise<Loaded> {
  loading ??= Promise.race([
    import("./card-book-3d").then(
      (m): Loaded => ({
        default: m.CardBook3D as ComponentType<CardBook3DProps>,
      }),
    ),
    new Promise<Loaded>((_, reject) =>
      window.setTimeout(() => reject(new Error("timed out")), LOAD_TIMEOUT_MS),
    ),
  ]).catch((): Loaded => ({ default: CardBook3DUnavailable }))
  return loading
}

// Start fetching as soon as this module runs in the browser, before any card renders.
if (typeof window !== "undefined") void loadCardBook3D()

const LazyCardBook3D = lazy(loadCardBook3D)

/**
 * Shown on the server and while the 3D card's code loads: the closed card's cover, drawn
 * exactly where the 3D card will draw it, in a frame the same size as the real one, so nothing
 * moves or resizes when it takes over.
 */
function CardBook3DPlaceholder({
  imageUrl,
  headline,
  recipientName,
  coverOnly = false,
  showPager = true,
  frameClassName,
  closedZoom,
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
        />
      </div>
      {/* Room for the pager underneath the real card. */}
      {showPager ? <div className="h-8" aria-hidden /> : null}
    </div>
  )
}

const subscribeNever = () => () => {}

/**
 * The 3D card, loaded on demand so `three` stays out of each route's initial JavaScript. It
 * needs WebGL, so the server (and hydration) render the placeholder and the card takes over
 * in the browser. If its code cannot be loaded, the caller's `fallback` (the flat card) shows.
 */
export function CardBook3D(props: CardBook3DProps) {
  const inBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  if (!inBrowser) return <CardBook3DPlaceholder {...props} />
  return (
    <Suspense fallback={<CardBook3DPlaceholder {...props} />}>
      <LazyCardBook3D {...props} />
    </Suspense>
  )
}

export type { CardBook3DProps, PageEditorArgs } from "./card-book-3d"
