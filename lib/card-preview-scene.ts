import type { RgbaImage } from "@/lib/png-rgba"
import {
  createImage,
  drawImageOver,
  drawQuad,
  dropShadow,
  type Quad,
  type Rgb,
  type Shade,
} from "@/lib/perspective-warp"

type Vec3 = readonly [number, number, number]

/** Card size in scene units (the 4:5 of the real card) and paper thickness. */
const CARD_W = 400
const CARD_H = 500
const PAPER = 4

/** How far the cover is swung open on its spine, and how the card is turned to the camera. */
const OPEN = (24 * Math.PI) / 180
const YAW = (-9 * Math.PI) / 180
const PITCH = (-6 * Math.PI) / 180
const CAMERA_DISTANCE = 1500

/** Light from the upper left, in front: the direction towards it. */
const LIGHT = normalize([-0.35, -0.55, 0.76])
const AMBIENT = 0.58
const DIFFUSE = 0.42
/** Brightness of a surface facing the camera straight on, so it shows at its own colour. */
const FACING = AMBIENT + DIFFUSE * LIGHT[2]

const PAPER_EDGE: Rgb = [236, 228, 214]
const SHADOW_COLOR: Rgb = [70, 35, 20]

function normalize([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
}

function average(points: readonly Vec3[]): Vec3 {
  let x = 0
  let y = 0
  let z = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
    z += p[2]
  }
  return [x / points.length, y / points.length, z / points.length]
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/** Swings a point of the cover open about the spine (the card's left edge). */
function openCover([x, y, z]: Vec3): Vec3 {
  return [
    x * Math.cos(OPEN) - z * Math.sin(OPEN),
    y,
    x * Math.sin(OPEN) + z * Math.cos(OPEN),
  ]
}

/** Card space (x from the spine, y down, z towards the camera) to camera space. */
function toCamera([x, y, z]: Vec3): Vec3 {
  const cx = x - CARD_W / 2
  const cy = y - CARD_H / 2
  // Turn about the vertical axis, then tip about the horizontal one.
  const x1 = cx * Math.cos(YAW) + z * Math.sin(YAW)
  const z1 = -cx * Math.sin(YAW) + z * Math.cos(YAW)
  const y2 = cy * Math.cos(PITCH) - z1 * Math.sin(PITCH)
  const z2 = cy * Math.sin(PITCH) + z1 * Math.cos(PITCH)
  return [x1, y2, z2]
}

function project([x, y, z]: Vec3): { x: number; y: number } {
  const s = CAMERA_DISTANCE / (CAMERA_DISTANCE - z)
  return { x: x * s, y: y * s }
}

type Face = {
  /** Corners in camera space: top-left, top-right, bottom-right, bottom-left of its picture. */
  corners: readonly [Vec3, Vec3, Vec3, Vec3]
  fill: RgbaImage | Rgb
  /** Extra shading across the face, on top of its lighting. */
  shade?: Shade
}

/** The six faces of a slab of paper, from its eight corners (front face first). */
function slabFaces(
  front: readonly [Vec3, Vec3, Vec3, Vec3],
  back: readonly [Vec3, Vec3, Vec3, Vec3],
  frontFill: RgbaImage | Rgb,
  frontShade?: Shade,
): Face[] {
  const [f0, f1, f2, f3] = front
  const [b0, b1, b2, b3] = back
  return [
    { corners: front, fill: frontFill, shade: frontShade },
    { corners: [b1, b0, b3, b2], fill: PAPER_EDGE },
    { corners: [b0, b1, f1, f0], fill: PAPER_EDGE }, // top edge
    { corners: [f3, f2, b2, b3], fill: PAPER_EDGE }, // bottom edge
    { corners: [f1, b1, b2, f2], fill: PAPER_EDGE }, // right edge
    { corners: [b0, f0, f3, b3], fill: PAPER_EDGE }, // spine edge
  ]
}

function rect(z: number, map: (p: Vec3) => Vec3 = (p) => p) {
  return [
    map([0, 0, z]),
    map([CARD_W, 0, z]),
    map([CARD_W, CARD_H, z]),
    map([0, CARD_H, z]),
  ] as const
}

/** A cream page with a faint top-to-bottom tone, for the inside of the card. */
function insidePaper(): RgbaImage {
  const image = createImage(4, 64)
  for (let y = 0; y < image.height; y++) {
    const t = y / (image.height - 1)
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4
      image.data[i] = Math.round(252 - 6 * t)
      image.data[i + 1] = Math.round(248 - 8 * t)
      image.data[i + 2] = Math.round(241 - 12 * t)
      image.data[i + 3] = 255
    }
  }
  return image
}

export type CardSceneImage = {
  /** The card and its shadow, with room around it for the shadow. */
  image: RgbaImage
  /** Where the card itself sits in `image` (without the shadow's margin). */
  card: { x: number; y: number; width: number; height: number }
}

/**
 * The card as the 3D card shows it: a folded card of real thickness with its cover swung a
 * little open on the spine, turned towards the viewer, lit from the upper left and casting a
 * soft shadow. `cover` is the flat front. The card is drawn to fit `maxWidth` × `maxHeight`
 * pixels.
 */
export function renderCardScene(
  cover: RgbaImage,
  maxWidth: number,
  maxHeight: number,
): CardSceneImage {
  const backFaces = slabFaces(
    rect(0, toCamera),
    rect(-PAPER, toCamera),
    insidePaper(),
    // Soft shadow in the fold, where the open cover shuts out light near the spine.
    (u) => 1 - 0.32 * Math.exp(-u * 7),
  )
  const coverFaces = slabFaces(
    rect(PAPER, (p) => toCamera(openCover(p))),
    rect(0, (p) => toCamera(openCover(p))),
    cover,
  )
  const faces = [...backFaces, ...coverFaces]
  const camera: Vec3 = [0, 0, CAMERA_DISTANCE]

  // Fit the card to the space, then leave a margin for its shadow.
  const points = faces.flatMap((face) => face.corners.map(project))
  const minX = Math.min(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const spanX = Math.max(...points.map((p) => p.x)) - minX
  const spanY = Math.max(...points.map((p) => p.y)) - minY
  const scale = Math.min(maxWidth / spanX, maxHeight / spanY)
  const margin = Math.round(Math.max(maxWidth, maxHeight) * 0.12)
  const width = Math.ceil(spanX * scale) + margin * 2
  const height = Math.ceil(spanY * scale) + margin * 2
  const toPixels = (p: { x: number; y: number }) => ({
    x: (p.x - minX) * scale + margin,
    y: (p.y - minY) * scale + margin,
  })

  const card = createImage(width, height)
  for (const slab of [backFaces, coverFaces]) {
    const slabCentre = average(slab.flatMap((face) => face.corners))
    for (const face of slab) {
      const [p0, p1, , p3] = face.corners
      const faceCentre = average(face.corners)
      let normal = normalize(cross(sub(p1, p0), sub(p3, p0)))
      if (dot(normal, sub(faceCentre, slabCentre)) < 0) {
        normal = [-normal[0], -normal[1], -normal[2]]
      }
      // Skip faces turned away from the camera.
      if (dot(normal, sub(camera, faceCentre)) <= 0) continue
      const light =
        (AMBIENT + DIFFUSE * Math.max(0, dot(normal, LIGHT))) / FACING
      const quad = face.corners.map((p) =>
        toPixels(project(p)),
      ) as unknown as Quad
      const extra = face.shade
      drawQuad(
        card,
        quad,
        face.fill,
        extra ? (u, v) => light * extra(u, v) : () => light,
      )
    }
  }

  const image = dropShadow(
    card,
    Math.round(10 * scale),
    Math.round(24 * scale),
    30 * scale,
    SHADOW_COLOR,
    0.34,
  )
  drawImageOver(image, card)
  return {
    image,
    card: {
      x: margin,
      y: margin,
      width: Math.ceil(spanX * scale),
      height: Math.ceil(spanY * scale),
    },
  }
}
