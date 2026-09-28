import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
} from "@/components/card-book-3d/page-painter"
import type { Point2 } from "@/lib/quad-transform"

/** Page size in scene units (page width = 1). */
export const PAGE_W = 1
export const PAGE_H = (PAGE_W * PAGE_HEIGHT_PX) / PAGE_WIDTH_PX

/** Vertical field of view of the card's camera, in degrees. */
export const CAMERA_FOV = 30
/** Room around the framed pages, as a multiple of their width and height. */
export const FRAME_MARGIN_W = 1.14
export const FRAME_MARGIN_H = 1.2
/** A closed card is seen a little from the side (radians)… */
export const CLOSED_YAW = 0.32
/** …and from above: the camera's pitch when browsing, plus extra while closed (radians). */
export const BROWSE_PITCH = 0.08
export const CLOSED_PITCH = 0.1

type Vec3 = { x: number; y: number; z: number }

const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a.x, a.y, a.z)
  return { x: a.x / length, y: a.y / length, z: a.z / length }
}

/** A rectangle on the card's resting plane, in scene units (y up, the spine at x = 0). */
export type PlaneRect = {
  left: number
  right: number
  top: number
  bottom: number
  z?: number
}

/**
 * Where a rectangle on the closed card's plane appears in a `width` × `height` frame, as the
 * 3D card's camera frames a closed card at rest (corners: top-left, top-right, bottom-right,
 * bottom-left, in px from the frame's top left).
 */
export function closedPlaneQuad(
  width: number,
  height: number,
  rect: PlaneRect,
): [Point2, Point2, Point2, Point2] {
  const aspect = width / height
  const tanHalfFov = Math.tan((CAMERA_FOV * Math.PI) / 360)
  const distance = Math.max(
    (PAGE_H * FRAME_MARGIN_H) / 2 / tanHalfFov,
    (PAGE_W * FRAME_MARGIN_W) / 2 / (tanHalfFov * aspect),
  )
  const yaw = CLOSED_YAW
  const pitch = BROWSE_PITCH + CLOSED_PITCH
  // Closed on the front, the camera centres on the cover.
  const target: Vec3 = { x: PAGE_W / 2, y: 0, z: 0 }
  const eye: Vec3 = {
    x: target.x + distance * Math.sin(yaw) * Math.cos(pitch),
    y: distance * Math.sin(pitch),
    z: distance * Math.cos(yaw) * Math.cos(pitch),
  }
  const forward = normalize(sub(target, eye))
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }))
  const up = cross(right, forward)

  const project = (x: number, y: number): Point2 => {
    const v = sub({ x, y, z: rect.z ?? 0 }, eye)
    const depth = dot(v, forward)
    const ndcX = dot(v, right) / (depth * tanHalfFov * aspect)
    const ndcY = dot(v, up) / (depth * tanHalfFov)
    return { x: ((ndcX + 1) / 2) * width, y: ((1 - ndcY) / 2) * height }
  }

  return [
    project(rect.left, rect.top),
    project(rect.right, rect.top),
    project(rect.right, rect.bottom),
    project(rect.left, rect.bottom),
  ]
}

/**
 * Where the front cover of the closed card appears in a `width` × `height` frame, as the 3D
 * card's camera frames it at rest. Lets a placeholder draw the cover exactly where the 3D
 * card will, so the hand-over is seamless.
 */
export function closedCoverQuad(
  width: number,
  height: number,
): [Point2, Point2, Point2, Point2] {
  return closedPlaneQuad(width, height, {
    left: 0,
    right: PAGE_W,
    top: PAGE_H / 2,
    bottom: -PAGE_H / 2,
  })
}

/**
 * The closed card's pose as plain CSS 3D, so it can be drawn before any JavaScript runs (e.g.
 * in server-rendered HTML). Lengths are container units of a size container that is the 3D
 * card's frame. The camera backs off to fit the page's height or, in narrow frames, its width;
 * either way the view scales with that side, so one scene unit is the smaller of the two
 * lengths below and the pose is exact at any frame size.
 */
export const closedCardCss = (() => {
  const yaw = CLOSED_YAW
  const pitch = BROWSE_PITCH + CLOSED_PITCH
  // Unit vector from the target towards the camera, and the camera's right and up.
  const back: Vec3 = {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  }
  const forward: Vec3 = { x: -back.x, y: -back.y, z: -back.z }
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }))
  const up = cross(right, forward)
  const tanHalfFov = Math.tan((CAMERA_FOV * Math.PI) / 360)
  // One scene unit at the target, when the frame's height or its width limits the view.
  const unitByHeight = 100 / (PAGE_H * FRAME_MARGIN_H)
  const unitByWidth = 100 / (PAGE_W * FRAME_MARGIN_W)
  // Scene (x right, y up, z out) to CSS (x right, y down, z out) through the camera: the
  // columns are where the element's own x, y and z axes land.
  const m = [
    right.x,
    -up.x,
    back.x,
    0,
    -right.y,
    up.y,
    -back.y,
    0,
    right.z,
    -up.z,
    back.z,
    0,
    0,
    0,
    0,
    1,
  ]
  return {
    /** CSS `perspective` of the frame, in cqh (the camera's focal length). */
    perspective: 100 / (2 * tanHalfFov),
    /** Scene unit (page width = 1) in cqh when the height limits the view… */
    unitByHeight,
    /** …and in cqw when the width does; the smaller applies. */
    unitByWidth,
    /** CSS length of one scene unit. */
    unitCss: `min(${unitByHeight.toFixed(4)}cqh, ${unitByWidth.toFixed(4)}cqw)`,
    /** Rotation from a flat element (the card's plane) into the camera's view. */
    rotation: `matrix3d(${m.map((n) => Math.round(n * 1e6) / 1e6).join(",")})`,
    matrix: m,
  }
})()
