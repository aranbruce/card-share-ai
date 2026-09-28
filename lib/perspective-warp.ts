import type { RgbaImage } from "@/lib/png-rgba"
import { type Point2, unmapBoxPoint } from "@/lib/quad-transform"

type Quad = readonly [Point2, Point2, Point2, Point2]

/**
 * Draws `source` onto the quad (top-left, top-right, bottom-right, bottom-left), as a flat
 * picture seen in perspective. The result covers the quad's bounds (rounded up from 0, 0);
 * pixels outside the quad are transparent, and its edges are antialiased by sampling.
 */
export function warpToQuad(source: RgbaImage, quad: Quad): RgbaImage {
  const width = Math.ceil(Math.max(...quad.map((p) => p.x)))
  const height = Math.ceil(Math.max(...quad.map((p) => p.y)))
  const out = new Uint8Array(width * height * 4)
  const { width: sw, height: sh, data: src } = source

  // Reads a source pixel as premultiplied RGBA; outside the image is transparent.
  const texel = (x: number, y: number, into: number[], weight: number) => {
    if (x < 0 || y < 0 || x >= sw || y >= sh) return
    const i = (y * sw + x) * 4
    const a = (src[i + 3] / 255) * weight
    into[0] += src[i] * a
    into[1] += src[i + 1] * a
    into[2] += src[i + 2] * a
    into[3] += a
  }

  const acc = [0, 0, 0, 0]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = unmapBoxPoint(sw, sh, quad, x + 0.5, y + 0.5)
      if (!p) continue
      // Bilinear sample at the pixel centre.
      const fx = p.x - 0.5
      const fy = p.y - 0.5
      if (fx < -1 || fy < -1 || fx > sw || fy > sh) continue
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      acc[0] = acc[1] = acc[2] = acc[3] = 0
      texel(x0, y0, acc, (1 - tx) * (1 - ty))
      texel(x0 + 1, y0, acc, tx * (1 - ty))
      texel(x0, y0 + 1, acc, (1 - tx) * ty)
      texel(x0 + 1, y0 + 1, acc, tx * ty)
      if (acc[3] <= 0) continue
      const o = (y * width + x) * 4
      out[o] = Math.round(acc[0] / acc[3])
      out[o + 1] = Math.round(acc[1] / acc[3])
      out[o + 2] = Math.round(acc[2] / acc[3])
      out[o + 3] = Math.round(Math.min(1, acc[3]) * 255)
    }
  }
  return { width, height, data: out }
}
