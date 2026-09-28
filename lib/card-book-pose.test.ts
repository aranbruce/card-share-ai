import { PerspectiveCamera, Vector3 } from "three"
import { describe, expect, it } from "vitest"
import {
  BROWSE_PITCH,
  CAMERA_FOV,
  CLOSED_PITCH,
  CLOSED_YAW,
  closedCardCss,
  closedCoverQuad,
  FRAME_MARGIN_H,
  FRAME_MARGIN_W,
  MIN_CSS_POSE_ASPECT,
  PAGE_H,
  PAGE_W,
} from "./card-book-pose"

/** The 3D card's camera at rest on a closed card, as its render loop sets it up. */
function threeQuad(width: number, height: number) {
  const camera = new PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 50)
  const halfFov = (CAMERA_FOV * Math.PI) / 360
  const distance = Math.max(
    (PAGE_H * FRAME_MARGIN_H) / 2 / Math.tan(halfFov),
    (PAGE_W * FRAME_MARGIN_W) / 2 / (Math.tan(halfFov) * camera.aspect),
  )
  const pitch = BROWSE_PITCH + CLOSED_PITCH
  const camX = PAGE_W / 2
  camera.position.set(
    camX + distance * Math.sin(CLOSED_YAW) * Math.cos(pitch),
    distance * Math.sin(pitch),
    distance * Math.cos(CLOSED_YAW) * Math.cos(pitch),
  )
  camera.lookAt(camX, 0, 0)
  camera.updateMatrixWorld()
  return [
    [0, PAGE_H / 2],
    [PAGE_W, PAGE_H / 2],
    [PAGE_W, -PAGE_H / 2],
    [0, -PAGE_H / 2],
  ].map(([x, y]) => {
    const p = new Vector3(x, y, 0).project(camera)
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height }
  })
}

describe("closed card pose", () => {
  it.each([
    [672, 504],
    [358, 448],
    [900, 560],
    [300, 560],
  ])("matches the 3D camera in a %i×%i frame", (width, height) => {
    const quad = closedCoverQuad(width, height)
    threeQuad(width, height).forEach((p, i) => {
      expect(quad[i].x).toBeCloseTo(p.x, 6)
      expect(quad[i].y).toBeCloseTo(p.y, 6)
    })
  })

  it("keeps the cover inside the frame", () => {
    for (const [w, h] of [
      [672, 504],
      [358, 448],
    ]) {
      for (const p of closedCoverQuad(w, h)) {
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(w)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(h)
      }
    }
  })
})

describe("closed card pose in CSS", () => {
  /** Projects a scene point the way the browser does for `closedCardCss`. */
  function cssProject(width: number, height: number, x: number, y: number) {
    const cqh = height / 100
    const { matrix: m, unit, perspective } = closedCardCss
    // Element coordinates (px from the pose's centre, y down), relative to the target.
    const ex = (x - PAGE_W / 2) * unit * cqh
    const ey = -y * unit * cqh
    const cx = m[0] * ex + m[4] * ey
    const cy = m[1] * ex + m[5] * ey
    const cz = m[2] * ex + m[6] * ey
    const p = perspective * cqh
    const s = p / (p - cz)
    return { x: width / 2 + cx * s, y: height / 2 + cy * s }
  }

  it.each([
    [672, 504],
    [358, 448],
    [900, 560],
    [640, 560],
  ])("draws the cover where the 3D camera does in a %i×%i frame", (w, h) => {
    expect(w / h).toBeGreaterThanOrEqual(MIN_CSS_POSE_ASPECT)
    const corners = [
      [0, PAGE_H / 2],
      [PAGE_W, PAGE_H / 2],
      [PAGE_W, -PAGE_H / 2],
      [0, -PAGE_H / 2],
    ]
    closedCoverQuad(w, h).forEach((expected, i) => {
      const p = cssProject(w, h, corners[i][0], corners[i][1])
      expect(p.x).toBeCloseTo(expected.x, 6)
      expect(p.y).toBeCloseTo(expected.y, 6)
    })
  })
})
