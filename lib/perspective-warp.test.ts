import { describe, expect, it } from "vitest"
import {
  createImage,
  drawImageOver,
  drawQuad,
  dropShadow,
} from "./perspective-warp"

function solid(width: number, height: number) {
  const image = createImage(width, height)
  for (let i = 0; i < image.data.length; i += 4) {
    image.data.set([200, 100, 50, 255], i)
  }
  return image
}

const pixel = (img: ReturnType<typeof createImage>, x: number, y: number) =>
  Array.from(
    img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
  )

describe("perspective raster", () => {
  it("draws an image unchanged onto its own rectangle", () => {
    const dest = createImage(10, 8)
    drawQuad(
      dest,
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
        { x: 0, y: 8 },
      ],
      solid(10, 8),
    )
    expect(pixel(dest, 0, 0)).toEqual([200, 100, 50, 255])
    expect(pixel(dest, 9, 7)).toEqual([200, 100, 50, 255])
  })

  it("fills the quad, leaves the outside alone and shades it", () => {
    const dest = createImage(100, 110)
    const quad = [
      { x: 10, y: 20 },
      { x: 90, y: 0 },
      { x: 95, y: 110 },
      { x: 0, y: 100 },
    ] as const
    drawQuad(dest, quad, [100, 100, 100], () => 0.5)
    expect(pixel(dest, 50, 55)).toEqual([50, 50, 50, 255])
    expect(pixel(dest, 1, 1)[3]).toBe(0)
    expect(pixel(dest, 98, 2)[3]).toBe(0)
  })

  it("antialiases edges with partial coverage", () => {
    const dest = createImage(10, 10)
    drawQuad(
      dest,
      [
        { x: 0, y: 0 },
        { x: 5.5, y: 0 },
        { x: 5.5, y: 10 },
        { x: 0, y: 10 },
      ],
      [255, 255, 255],
    )
    expect(pixel(dest, 4, 5)[3]).toBe(255)
    const edge = pixel(dest, 5, 5)[3]
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(255)
    expect(pixel(dest, 6, 5)[3]).toBe(0)
  })

  it("casts a soft, offset shadow under an image", () => {
    const shape = createImage(40, 40)
    drawQuad(
      shape,
      [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
        { x: 10, y: 20 },
      ],
      [255, 255, 255],
    )
    const shadow = dropShadow(shape, 5, 5, 6, [0, 0, 0], 0.5)
    expect(pixel(shadow, 20, 20)[3]).toBeGreaterThan(pixel(shadow, 12, 12)[3])
    expect(pixel(shadow, 20, 20)[3]).toBeLessThanOrEqual(128)
    expect(pixel(shadow, 2, 2)[3]).toBe(0)
    drawImageOver(shadow, shape)
    expect(pixel(shadow, 15, 15)).toEqual([255, 255, 255, 255])
  })
})
