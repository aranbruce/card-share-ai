import { describe, expect, it } from "vitest"

import {
  bookCenterOffset,
  buildBookFaces,
  curlPoint,
  leafCountForFaces,
  leafProgress,
  openness,
  settleFlipTarget,
  spreadForPage,
} from "@/lib/card-book"

describe("buildBookFaces", () => {
  it("puts the cover first and the back cover last", () => {
    const faces = buildBookFaces(2)
    expect(faces[0]).toEqual({ kind: "cover" })
    expect(faces[faces.length - 1]).toEqual({ kind: "back" })
  })

  it("always produces an even face count", () => {
    for (let pages = 1; pages <= 7; pages++) {
      expect(buildBookFaces(pages).length % 2).toBe(0)
    }
  })

  it("uses one leaf per two faces", () => {
    expect(leafCountForFaces(buildBookFaces(2))).toBe(2)
    expect(leafCountForFaces(buildBookFaces(3))).toBe(2)
    expect(leafCountForFaces(buildBookFaces(4))).toBe(3)
  })

  it("pads with a blank face so the back cover sits on the last leaf's back", () => {
    expect(buildBookFaces(2)).toEqual([
      { kind: "cover" },
      { kind: "page", pageIndex: 1 },
      { kind: "blank" },
      { kind: "back" },
    ])
    expect(buildBookFaces(3)).toEqual([
      { kind: "cover" },
      { kind: "page", pageIndex: 1 },
      { kind: "page", pageIndex: 2 },
      { kind: "back" },
    ])
  })

  it("treats invalid page counts as cover-only", () => {
    expect(buildBookFaces(0)).toEqual([{ kind: "cover" }, { kind: "back" }])
    expect(buildBookFaces(Number.NaN)).toEqual([
      { kind: "cover" },
      { kind: "back" },
    ])
  })
})

describe("spreadForPage", () => {
  it("maps card pages to the spread where they are visible", () => {
    expect(spreadForPage(0)).toBe(0)
    expect(spreadForPage(1)).toBe(1)
    expect(spreadForPage(2)).toBe(1)
    expect(spreadForPage(3)).toBe(2)
    expect(spreadForPage(-2)).toBe(0)
  })

  it("agrees with the face layout", () => {
    const faces = buildBookFaces(6)
    faces.forEach((face, faceIndex) => {
      if (face.kind !== "page") return
      const leaf = Math.floor(faceIndex / 2)
      const isFront = faceIndex % 2 === 0
      // Front faces show while their leaf is unturned; backs once it has turned.
      expect(spreadForPage(face.pageIndex)).toBe(isFront ? leaf : leaf + 1)
    })
  })
})

describe("leafProgress", () => {
  it("turns leaves one after another", () => {
    expect(leafProgress(0.5, 0)).toBe(0.5)
    expect(leafProgress(0.5, 1)).toBe(0)
    expect(leafProgress(1.25, 0)).toBe(1)
    expect(leafProgress(1.25, 1)).toBe(0.25)
  })
})

describe("openness and centring", () => {
  it("is closed on both covers and open in between", () => {
    expect(openness(0, 2)).toBe(0)
    expect(openness(1, 2)).toBe(1)
    expect(openness(2, 2)).toBe(0)
  })

  it("shifts the book so the visible pages are centred", () => {
    expect(bookCenterOffset(0, 2)).toBe(-0.5)
    expect(bookCenterOffset(1, 2)).toBe(0)
    expect(bookCenterOffset(2, 2)).toBe(0.5)
  })

  it("stays centred on a single-leaf card mid-turn", () => {
    expect(bookCenterOffset(0.5, 1)).toBe(0)
  })
})

describe("curlPoint", () => {
  it("lies flat on the right when unturned", () => {
    const p = curlPoint(1, 1, 0)
    expect(p.x).toBeCloseTo(1)
    expect(p.z).toBeCloseTo(0)
  })

  it("lies flat on the left when fully turned", () => {
    const p = curlPoint(1, 1, 1)
    expect(p.x).toBeCloseTo(-1)
    expect(p.z).toBeCloseTo(0)
  })

  it("keeps the spine fixed", () => {
    for (const progress of [0, 0.3, 0.5, 0.9]) {
      const p = curlPoint(0, 1, progress)
      expect(p.x).toBeCloseTo(0)
      expect(p.z).toBeCloseTo(0)
    }
  })

  it("preserves page length while curled (points stay within the width)", () => {
    const p = curlPoint(1, 1, 0.5)
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(1 + 1e-9)
    // Lifted toward the viewer mid-turn.
    expect(p.z).toBeGreaterThan(0.5)
  })
})

describe("settleFlipTarget", () => {
  it("snaps to the nearest spread when released slowly", () => {
    expect(settleFlipTarget(0.4, 0, 3)).toBe(0)
    expect(settleFlipTarget(0.6, 0, 3)).toBe(1)
  })

  it("commits a flick in its direction", () => {
    expect(settleFlipTarget(0.2, 2, 3)).toBe(1)
    expect(settleFlipTarget(1.8, -2, 3)).toBe(1)
  })

  it("clamps to the available leaves", () => {
    expect(settleFlipTarget(3, 5, 3)).toBe(3)
    expect(settleFlipTarget(0, -5, 3)).toBe(0)
  })
})
