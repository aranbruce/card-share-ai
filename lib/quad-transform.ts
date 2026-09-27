export type Point2 = { x: number; y: number }

/**
 * CSS `matrix3d` that maps a `width` × `height` box (with `transform-origin: 0 0`) onto an
 * arbitrary quad, e.g. a page of the WebGL card projected to the screen. A flat rectangle seen
 * in perspective is a projective map of the plane, which `matrix3d` expresses exactly, so text,
 * carets and hit testing in the element line up with the rendered page.
 *
 * Corners are in order: top-left, top-right, bottom-right, bottom-left.
 */
export function quadToMatrix3d(
  width: number,
  height: number,
  [p0, p1, p2, p3]: readonly [Point2, Point2, Point2, Point2],
): string {
  const h = unitSquareToQuad(p0, p1, p2, p3)
  // Scale the unit square up to the element's box.
  const a = h.a / width
  const b = h.b / height
  const d = h.d / width
  const e = h.e / height
  const g = h.g / width
  const k = h.h / height
  // Column-major; z passes through untouched.
  return `matrix3d(${[a, d, 0, g, b, e, 0, k, 0, 0, 1, 0, h.c, h.f, 0, 1]
    .map((n) => round(n))
    .join(",")})`
}

/** Applies the same map as `quadToMatrix3d` to a point in the box (for tests and hit maths). */
export function mapBoxPoint(
  width: number,
  height: number,
  quad: readonly [Point2, Point2, Point2, Point2],
  x: number,
  y: number,
): Point2 {
  const h = unitSquareToQuad(...quad)
  const u = x / width
  const v = y / height
  const w = h.g * u + h.h * v + 1
  return {
    x: (h.a * u + h.b * v + h.c) / w,
    y: (h.d * u + h.e * v + h.f) / w,
  }
}

/** Heckbert's square-to-quad projective map: (u, v) ∈ [0, 1]² → quad. */
function unitSquareToQuad(p0: Point2, p1: Point2, p2: Point2, p3: Point2) {
  const sx = p0.x - p1.x + p2.x - p3.x
  const sy = p0.y - p1.y + p2.y - p3.y
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return {
      a: p1.x - p0.x,
      b: p3.x - p0.x,
      c: p0.x,
      d: p1.y - p0.y,
      e: p3.y - p0.y,
      f: p0.y,
      g: 0,
      h: 0,
    }
  }
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const det = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / det
  const h = (dx1 * sy - sx * dy1) / det
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  }
}

function round(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : "0"
}
