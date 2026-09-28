import type { RgbaImage } from "@/lib/png-rgba"
import { type Point2, quadUnmapper } from "@/lib/quad-transform"

export type Quad = readonly [Point2, Point2, Point2, Point2]
export type Rgb = readonly [number, number, number]

/** Brightness multiplier across a surface, from its (u, v) in 0..1. */
export type Shade = (u: number, v: number) => number

export function createImage(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8Array(width * height * 4) }
}

// Sub-pixel offsets for 4× supersampled edge coverage (a rotated grid).
const SUBSAMPLES = [
  [0.375, 0.125],
  [0.875, 0.375],
  [0.125, 0.625],
  [0.625, 0.875],
] as const

/**
 * Draws a picture (or a flat colour) onto a quad (top-left, top-right, bottom-right,
 * bottom-left) of `dest` in perspective, over what is already there: a flat surface seen at
 * an angle. Edges are antialiased; `shade` darkens or lightens it across its surface.
 */
export function drawQuad(
  dest: RgbaImage,
  quad: Quad,
  fill: RgbaImage | Rgb,
  shade: Shade = () => 1,
): void {
  const unmap = quadUnmapper(quad)
  const minX = Math.max(0, Math.floor(Math.min(...quad.map((p) => p.x))))
  const minY = Math.max(0, Math.floor(Math.min(...quad.map((p) => p.y))))
  const maxX = Math.min(
    dest.width,
    Math.ceil(Math.max(...quad.map((p) => p.x))),
  )
  const maxY = Math.min(
    dest.height,
    Math.ceil(Math.max(...quad.map((p) => p.y))),
  )
  const image = "data" in fill ? fill : null
  const color = [0, 0, 0, 0]

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      let inside = 0
      for (const [dx, dy] of SUBSAMPLES) {
        const p = unmap(x + dx, y + dy)
        if (p && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) inside++
      }
      if (!inside) continue
      const centre = unmap(x + 0.5, y + 0.5)
      if (!centre) continue
      const u = Math.min(1, Math.max(0, centre.x))
      const v = Math.min(1, Math.max(0, centre.y))
      if (image) sampleBilinear(image, u, v, color)
      else {
        color[0] = (fill as Rgb)[0]
        color[1] = (fill as Rgb)[1]
        color[2] = (fill as Rgb)[2]
        color[3] = 255
      }
      const k = shade(u, v)
      blendOver(
        dest,
        (y * dest.width + x) * 4,
        color[0] * k,
        color[1] * k,
        color[2] * k,
        (color[3] / 255) * (inside / SUBSAMPLES.length),
      )
    }
  }
}

/** Bilinear sample at (u, v) in 0..1, clamped to the image's edges. */
function sampleBilinear(
  image: RgbaImage,
  u: number,
  v: number,
  out: number[],
): void {
  const { width, height, data } = image
  const fx = Math.min(width - 1, Math.max(0, u * width - 0.5))
  const fy = Math.min(height - 1, Math.max(0, v * height - 0.5))
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0
  for (let c = 0; c < 4; c++) {
    const top =
      data[(y0 * width + x0) * 4 + c] * (1 - tx) +
      data[(y0 * width + x1) * 4 + c] * tx
    const bottom =
      data[(y1 * width + x0) * 4 + c] * (1 - tx) +
      data[(y1 * width + x1) * 4 + c] * tx
    out[c] = top * (1 - ty) + bottom * ty
  }
}

/** Source-over of a straight-alpha colour onto a straight-alpha pixel. */
function blendOver(
  dest: RgbaImage,
  i: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const d = dest.data
  const da = d[i + 3] / 255
  const outA = a + da * (1 - a)
  if (outA <= 0) return
  const keep = (da * (1 - a)) / outA
  const add = a / outA
  d[i] = Math.min(255, Math.round(r * add + d[i] * keep))
  d[i + 1] = Math.min(255, Math.round(g * add + d[i + 1] * keep))
  d[i + 2] = Math.min(255, Math.round(b * add + d[i + 2] * keep))
  d[i + 3] = Math.round(outA * 255)
}

/** Draws `top` over `dest` (same size), e.g. a card over its shadow. */
export function drawImageOver(dest: RgbaImage, top: RgbaImage): void {
  const t = top.data
  for (let i = 0; i < t.length; i += 4) {
    if (t[i + 3]) blendOver(dest, i, t[i], t[i + 1], t[i + 2], t[i + 3] / 255)
  }
}

/**
 * A soft shadow of `image`'s shape: its alpha, moved by (dx, dy), blurred by about `radius`
 * pixels (three box blurs, close to a Gaussian) and tinted `color` at `opacity`.
 */
export function dropShadow(
  image: RgbaImage,
  dx: number,
  dy: number,
  radius: number,
  color: Rgb,
  opacity: number,
): RgbaImage {
  const { width, height, data } = image
  let alpha: Float32Array = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    const sy = y - dy
    if (sy < 0 || sy >= height) continue
    for (let x = 0; x < width; x++) {
      const sx = x - dx
      if (sx < 0 || sx >= width) continue
      alpha[y * width + x] = data[(sy * width + sx) * 4 + 3] / 255
    }
  }
  const box = Math.max(1, Math.round(radius / 3))
  for (let pass = 0; pass < 3; pass++) {
    alpha = boxBlur(alpha, width, height, box, 1, width)
    alpha = boxBlur(alpha, width, height, box, width, 1)
  }
  const out = createImage(width, height)
  for (let i = 0; i < alpha.length; i++) {
    out.data[i * 4] = color[0]
    out.data[i * 4 + 1] = color[1]
    out.data[i * 4 + 2] = color[2]
    out.data[i * 4 + 3] = Math.round(Math.min(1, alpha[i]) * opacity * 255)
  }
  return out
}

/** One box-blur pass along rows (step 1) or columns (step = width). */
function boxBlur(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
  step: number,
  lineStep: number,
): Float32Array {
  const out = new Float32Array(src.length)
  const length = step === 1 ? width : height
  const lines = step === 1 ? height : width
  const size = radius * 2 + 1
  for (let line = 0; line < lines; line++) {
    const base = line * lineStep
    let sum = 0
    for (let i = -radius; i <= radius; i++) {
      if (i >= 0 && i < length) sum += src[base + i * step]
    }
    for (let i = 0; i < length; i++) {
      out[base + i * step] = sum / size
      const add = i + radius + 1
      const drop = i - radius
      if (add < length) sum += src[base + add * step]
      if (drop >= 0) sum -= src[base + drop * step]
    }
  }
  return out
}
