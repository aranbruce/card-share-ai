import { describe, expect, it } from "vitest"
import { warpToQuad } from "./perspective-warp"

function solid(width: number, height: number) {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set([200, 100, 50, 255], i)
  return { width, height, data }
}

const alphaAt = (img: ReturnType<typeof warpToQuad>, x: number, y: number) =>
  img.data[(y * img.width + x) * 4 + 3]

describe("perspective warp", () => {
  it("keeps an image the same on its own rectangle", () => {
    const src = solid(10, 8)
    const out = warpToQuad(src, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 0, y: 8 },
    ])
    expect(out.width).toBe(10)
    expect(out.height).toBe(8)
    expect(Array.from(out.data.slice(0, 4))).toEqual([200, 100, 50, 255])
  })

  it("fills the quad and leaves the outside transparent", () => {
    const out = warpToQuad(solid(40, 50), [
      { x: 10, y: 20 },
      { x: 90, y: 0 },
      { x: 95, y: 110 },
      { x: 0, y: 100 },
    ])
    expect(out.width).toBe(95)
    expect(out.height).toBe(110)
    expect(alphaAt(out, 50, 55)).toBe(255)
    expect(alphaAt(out, 1, 1)).toBe(0)
    expect(alphaAt(out, 94, 2)).toBe(0)
    const i = (55 * out.width + 50) * 4
    expect(Array.from(out.data.slice(i, i + 3))).toEqual([200, 100, 50])
  })
})
