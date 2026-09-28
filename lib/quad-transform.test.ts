import { describe, expect, it } from "vitest"
import {
  mapBoxPoint,
  quadToMatrix3d,
  unmapBoxPoint,
  type Point2,
} from "./quad-transform"

type Quad = [Point2, Point2, Point2, Point2]

describe("quad transform", () => {
  it("maps the box corners onto the quad", () => {
    const quad: Quad = [
      { x: 10, y: 20 },
      { x: 300, y: 40 },
      { x: 280, y: 420 },
      { x: 25, y: 400 },
    ]
    const corners: [number, number][] = [
      [0, 0],
      [448, 0],
      [448, 560],
      [0, 560],
    ]
    corners.forEach(([x, y], i) => {
      const p = mapBoxPoint(448, 560, quad, x, y)
      expect(p.x).toBeCloseTo(quad[i].x, 6)
      expect(p.y).toBeCloseTo(quad[i].y, 6)
    })
  })

  it("is a plain scale and translate for an axis-aligned rectangle", () => {
    const quad: Quad = [
      { x: 5, y: 7 },
      { x: 229, y: 7 },
      { x: 229, y: 287 },
      { x: 5, y: 287 },
    ]
    expect(quadToMatrix3d(448, 560, quad)).toBe(
      "matrix3d(0.5,0,0,0,0,0.5,0,0,0,0,1,0,5,7,0,1)",
    )
  })

  it("keeps the perspective terms for a foreshortened quad", () => {
    const quad: Quad = [
      { x: 0, y: 0 },
      { x: 200, y: 20 },
      { x: 200, y: 260 },
      { x: 0, y: 280 },
    ]
    const m = quadToMatrix3d(448, 560, quad)
    const values = m.slice(9, -1).split(",").map(Number)
    expect(values).toHaveLength(16)
    // The far edge is shorter, so w varies across x.
    expect(values[3]).not.toBe(0)
    const mid = mapBoxPoint(448, 560, quad, 448, 280)
    expect(mid.x).toBeCloseTo(200, 6)
    expect(mid.y).toBeCloseTo(140, 6)
  })

  it("maps screen points back into the box", () => {
    const quads: Quad[] = [
      [
        { x: 10, y: 20 },
        { x: 300, y: 40 },
        { x: 280, y: 420 },
        { x: 25, y: 400 },
      ],
      [
        { x: 5, y: 7 },
        { x: 229, y: 7 },
        { x: 229, y: 287 },
        { x: 5, y: 287 },
      ],
    ]
    for (const quad of quads) {
      for (const [x, y] of [
        [0, 0],
        [120, 40],
        [300, 500],
        [448, 560],
      ]) {
        const screen = mapBoxPoint(448, 560, quad, x, y)
        const back = unmapBoxPoint(448, 560, quad, screen.x, screen.y)
        expect(back?.x).toBeCloseTo(x, 5)
        expect(back?.y).toBeCloseTo(y, 5)
      }
    }
  })
})
