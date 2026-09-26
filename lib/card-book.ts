/**
 * Pure layout math for the Three.js page-turning card (`components/card-book-3d`).
 *
 * The card is modelled as a stack of leaves hinged on a shared spine. Each leaf has a front and
 * back face. Card pages (0 = cover, 1..n = inside pages) are laid out on faces in reading order,
 * followed by a back cover, so turning leaf `i` reveals face `2i + 1` on the left and `2i + 2`
 * on the right.
 */

export type BookFace =
  | { kind: "cover" }
  | { kind: "page"; pageIndex: number }
  | { kind: "blank" }
  | { kind: "back" }

/** Faces in reading order; always an even count so the back cover lands on the last leaf's back. */
export function buildBookFaces(totalPages: number): BookFace[] {
  const pages = Math.max(1, Math.trunc(totalPages) || 1)
  const faces: BookFace[] = [{ kind: "cover" }]
  for (let i = 1; i < pages; i++) faces.push({ kind: "page", pageIndex: i })
  if (faces.length % 2 === 0) faces.push({ kind: "blank" })
  faces.push({ kind: "back" })
  return faces
}

export function leafCountForFaces(faces: readonly BookFace[]): number {
  return Math.ceil(faces.length / 2)
}

/** Number of turned leaves needed to show a card page (0 = cover visible, closed). */
export function spreadForPage(pageIndex: number): number {
  return Math.ceil(Math.max(0, pageIndex) / 2)
}

/** How far leaf `leafIndex` has turned (0 = resting on the right, 1 = on the left). */
export function leafProgress(flip: number, leafIndex: number): number {
  return Math.min(1, Math.max(0, flip - leafIndex))
}

/**
 * How "open" the card is: 0 when closed on either cover, 1 once at least one leaf has fully
 * turned and at least one remains. Used to recentre and zoom the camera.
 */
export function openness(flip: number, leafCount: number): number {
  return Math.min(1, Math.max(0, flip), Math.max(0, leafCount - flip))
}

/** Horizontal shift that keeps the visible pages centred (page width = 1 unit). */
export function bookCenterOffset(flip: number, leafCount: number): number {
  const front = Math.min(1, Math.max(0, flip))
  const back = Math.min(1, Math.max(0, leafCount - flip))
  // Closed on the front: only the right page shows, so shift left by half a page.
  // Closed on the back: only the left page shows, so shift right.
  return -0.5 * (1 - front) + 0.5 * (1 - back)
}

/** Maximum extra curl (radians across the page width) applied mid-turn. */
export const PAGE_CURL_RADIANS = 0.9

/**
 * Position of a point `s` along a leaf (0 = spine, width = free edge) for a given turn
 * progress. The leaf bends so its free edge lags behind the spine, like card stock. Mirrors the
 * vertex shader in `components/card-book-3d/page-shader.ts`.
 */
export function curlPoint(
  s: number,
  width: number,
  progress: number,
  curl = PAGE_CURL_RADIANS,
): { x: number; z: number; angle: number } {
  const base = progress * Math.PI
  const k = (-curl * Math.sin(progress * Math.PI)) / width
  const angle = base + k * s
  if (Math.abs(k) < 1e-6) {
    return { x: Math.cos(base) * s, z: Math.sin(base) * s, angle }
  }
  return {
    x: (Math.sin(angle) - Math.sin(base)) / k,
    z: (Math.cos(base) - Math.cos(angle)) / k,
    angle,
  }
}

/**
 * Where a drag should settle when released. A flick (|velocity| in leaves/sec above the
 * threshold) commits the turn in that direction; otherwise snap to the nearest spread.
 */
export function settleFlipTarget(
  flip: number,
  velocity: number,
  leafCount: number,
  flickThreshold = 0.6,
): number {
  let target: number
  if (velocity > flickThreshold) target = Math.ceil(flip - 1e-3)
  else if (velocity < -flickThreshold) target = Math.floor(flip + 1e-3)
  else target = Math.round(flip)
  return Math.min(leafCount, Math.max(0, target))
}
