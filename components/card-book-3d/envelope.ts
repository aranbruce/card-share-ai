import {
  BackSide,
  type BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  FrontSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three"
import { PAGE_H, PAGE_W } from "@/lib/card-book-pose"
import type { EnvelopeStyle } from "./envelope-styles"

/** Envelope size (scene units; page width = 1): a little larger than the closed card. */
const ENV_W = PAGE_W * 1.14
const ENV_H = PAGE_H + 0.1
/** Depth of the flap's triangle from its hinge on the top edge. */
const FLAP_H = ENV_H * 0.6
/** How far the card inside pushes the envelope out at its middle. */
const PILLOW = 0.01
/** Extra room below the flap in its shadow's texture, as a share of the flap's depth. */
const FLAP_SHADOW_PAD = 0.12
/** Gap between the envelope's layers (and the card) so they never z-fight. */
const LAYER_GAP = 0.003
/**
 * The card is squashed to this share of its thickness while it is in the envelope (it can't
 * be seen there), so the envelope can wrap it as snugly as paper would. It grows back to its
 * full thickness once it is out.
 */
const CARD_SQUASH = 0.2
/** The pocket's front sits just in front of the closed card's cover. */
const LEAF_GAP_FRONT = LAYER_GAP + 0.004 * CARD_SQUASH

/** Timeline, in seconds after the tap. */
const FLAP_OPEN = [0.1, 0.75] as const
const CARD_RISE = [0.65, 1.6] as const
const CARD_SETTLE = [1.55, 2.4] as const
/** The card is clear of the envelope: time for confetti. */
export const ENVELOPE_CLEAR_AT = 1.5
export const ENVELOPE_DONE_AT = CARD_SETTLE[1]

/** How far the card rises while the envelope drops, then where the envelope goes after. */
const CARD_RISE_Y = 0.4
const ENV_DROP_Y = 1.05
const ENV_EXIT_Y = 1.5
/** Camera pull-back while sealed and while the card comes out (1 = the card's own framing). */
const SEALED_PULL = 1.14
const RISING_PULL = 1.5

/** Where the card and camera are at a moment of the intro. */
export type EnvelopePose = {
  cardY: number
  cardZ: number
  cardRoll: number
  cardYaw: number
  /** Scale of the card's thickness (squashed while it is inside). */
  cardDepth: number
  /** Multiplies the camera's distance. */
  cameraPull: number
  /** 0 → 1 as the card settles where it rests on its own (fades its table shadow in). */
  settled: number
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const span = (t: number, [a, b]: readonly [number, number]) =>
  clamp01((t - a) / (b - a))
const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
const easeOut = (x: number) => 1 - (1 - x) ** 3

export type Envelope = {
  group: Group
  /** Places the back panel behind a card of this many leaves. */
  setLeafCount: (count: number, leafGap: number) => void
  /** Redraws the address side (e.g. once the handwriting font has loaded). */
  paintFront: (recipientName: string, fontFamily: string) => void
  /**
   * Poses the envelope `t` seconds into the opening (null: still sealed), turned over by
   * `turn` (0 = face down, 1 = flap up; `turnDirection` ±1 picks the way it turns), and
   * returns where the card and camera go. `now` drives the sealed envelope's gentle bob.
   */
  pose: (
    t: number | null,
    turn: number,
    turnDirection: number,
    now: number,
  ) => EnvelopePose
  dispose: () => void
}

/**
 * A paper envelope for the 3D card to come out of: a pocket in front of the card, a back
 * panel behind it, and a lined flap hinged on the top edge. The
 * card sits at the envelope's centre (x = PAGE_W / 2, y = 0, its cover at z = 0).
 */
export function createEnvelope(
  shadowTexture: Texture,
  style: EnvelopeStyle,
): Envelope {
  const group = new Group()
  group.position.x = PAGE_W / 2
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(d: T) => {
    disposables.push(d)
    return d
  }

  const frontZ = LEAF_GAP_FRONT
  let backZ = -0.05

  // Lit like a room: soft light from above, a warm bounce from the table, and a key light
  // from the upper left. Only the envelope's (standard) materials respond to them.
  const sky = new HemisphereLight(0xffffff, 0xf2e9dc, 3)
  const key = new DirectionalLight(0xfff6ec, 0.9)
  key.position.set(-1.6, 2.4, 3)
  group.add(sky, key)
  // Everything that turns over with the envelope (the lights and table shadow stay put).
  const body = new Group()
  group.add(body)

  // Paper tooth, shared by every paper surface as a fine bump.
  const toothTexture = track(new CanvasTexture(grain()))
  toothTexture.wrapS = toothTexture.wrapT = RepeatWrapping
  toothTexture.repeat.set(5, 5.6)
  const paper = (
    map: Texture,
    extra: Partial<MeshStandardMaterialParameters> = {},
  ) =>
    track(
      new MeshStandardMaterial({
        map,
        bumpMap: toothTexture,
        bumpScale: 0.35,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        ...extra,
      }),
    )

  // Soft shadow on the table under the envelope.
  const shadowMaterial = track(
    new MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    }),
  )
  const shadowGeometry = track(new PlaneGeometry(1, 1))
  const shadow = new Mesh(shadowGeometry, shadowMaterial)
  shadow.scale.set(ENV_W * 1.14, ENV_H * 1.1, 1)
  shadow.position.y = -0.03
  shadow.renderOrder = -1
  group.add(shadow)

  // The back panel (the address side), bowed out a little by the card.
  const backGeometry = track(pillowPlane(ENV_W, ENV_H, -0.4))
  const backMaterial = paper(track(canvasTexture(paintBackPanel(style))))
  const back = new Mesh(backGeometry, backMaterial)
  body.add(back)

  // The pocket: side and bottom flaps folded over the card, with the recipient's name. The
  // card inside makes it bulge gently towards the viewer.
  const frontCanvas = document.createElement("canvas")
  frontCanvas.width = 1024
  frontCanvas.height = Math.round((1024 * ENV_H) / ENV_W)
  paintPocket(frontCanvas, style)
  const frontTexture = track(canvasTexture(frontCanvas))
  // Clear pixels (the opening) must not hide what is behind them.
  const frontMaterial = paper(frontTexture, { alphaTest: 0.02 })
  const front = new Mesh(track(pillowPlane(ENV_W, ENV_H, 1)), frontMaterial)
  front.position.z = frontZ
  body.add(front)

  // The address side, facing away from the card: the recipient's name and a stamp.
  const addressCanvas = document.createElement("canvas")
  addressCanvas.width = 1024
  addressCanvas.height = Math.round((1024 * ENV_H) / ENV_W)
  const addressTexture = track(canvasTexture(addressCanvas))
  const addressMaterial = paper(addressTexture)
  const address = new Mesh(
    track(
      followPillow(
        new PlaneGeometry(ENV_W, ENV_H, 48, 52).rotateY(Math.PI),
        0,
        -0.4,
      ),
    ),
    addressMaterial,
  )
  body.add(address)

  // Paper thickness along the folded edges (the top one is the flap's fold).
  const edgeMaterial = paper(track(canvasTexture(paintBackPanel(style))), {
    transparent: true,
  })
  const edges = {
    left: new Mesh(undefined, edgeMaterial),
    right: new Mesh(undefined, edgeMaterial),
    bottom: new Mesh(undefined, edgeMaterial),
    top: new Mesh(undefined, edgeMaterial),
  }
  body.add(edges.left, edges.right, edges.bottom, edges.top)

  // The closed flap's soft shadow on the pocket; it lifts away as the flap opens.
  const flapShadowMaterial = track(
    new MeshBasicMaterial({
      map: track(canvasTexture(paintFlapShadow())),
      transparent: true,
      depthWrite: false,
    }),
  )
  const shadowH = FLAP_H * (1 + FLAP_SHADOW_PAD)
  const flapShadow = new Mesh(
    track(
      followPillow(
        new PlaneGeometry(ENV_W, shadowH, 32, 16),
        ENV_H / 2 - shadowH / 2,
        1,
      ),
    ),
    flapShadowMaterial,
  )
  flapShadow.position.set(0, ENV_H / 2 - shadowH / 2, frontZ + LAYER_GAP / 2)
  body.add(flapShadow)

  // The flap, hinged on the top edge and shaped to lie over the pocket's bulge: curved
  // edges and a rounded tip (cut out of its textures), paper outside, a liner inside.
  const flapGeometry = track(createFlapGeometry())
  const flapOuterMaterial = paper(track(canvasTexture(paintFlapOuter(style))), {
    side: FrontSide,
    alphaTest: 0.5,
  })
  const flapInnerMaterial = paper(track(canvasTexture(paintFlapInner(style))), {
    side: BackSide,
    alphaTest: 0.5,
  })
  const flap = new Group()
  flap.position.y = ENV_H / 2
  flap.add(new Mesh(flapGeometry, flapOuterMaterial))
  flap.add(new Mesh(flapGeometry, flapInnerMaterial))
  body.add(flap)

  const fadeable = [
    addressMaterial,
    backMaterial,
    frontMaterial,
    edgeMaterial,
    flapOuterMaterial,
    flapInnerMaterial,
  ]

  const setLeafCount = (count: number, leafGap: number) => {
    backZ = -leafGap * count * CARD_SQUASH - LAYER_GAP
    back.position.z = backZ
    address.position.z = backZ - 0.002
    shadow.position.z = backZ - LAYER_GAP - 0.02
    const depth = frontZ - backZ
    const midZ = (frontZ + backZ) / 2
    for (const mesh of Object.values(edges)) mesh.geometry.dispose()
    edges.left.geometry = new PlaneGeometry(depth, ENV_H).rotateY(-Math.PI / 2)
    edges.left.position.set(-ENV_W / 2, 0, midZ)
    edges.right.geometry = new PlaneGeometry(depth, ENV_H).rotateY(Math.PI / 2)
    edges.right.position.set(ENV_W / 2, 0, midZ)
    edges.bottom.geometry = new PlaneGeometry(ENV_W, depth).rotateX(Math.PI / 2)
    edges.bottom.position.set(0, -ENV_H / 2, midZ)
    edges.top.geometry = new PlaneGeometry(ENV_W, depth).rotateX(-Math.PI / 2)
    edges.top.position.set(0, ENV_H / 2, midZ)
  }
  setLeafCount(1, LAYER_GAP)
  disposables.push({
    dispose: () => Object.values(edges).forEach((m) => m.geometry.dispose()),
  })

  const paintFront = (recipientName: string, fontFamily: string) => {
    paintAddress(addressCanvas, style, recipientName, fontFamily)
    addressTexture.needsUpdate = true
  }

  const pose = (
    t: number | null,
    turn: number,
    turnDirection: number,
    now: number,
  ): EnvelopePose => {
    const time = t ?? 0
    const open = easeInOut(span(time, FLAP_OPEN))
    const rise = easeInOut(span(time, CARD_RISE))
    const settle = easeInOut(span(time, CARD_SETTLE))

    // Sealed, the envelope bobs and turns gently (catching the light); the motion dies away
    // as it opens.
    const bob = t === null ? 1 : 1 - open
    const bobY = 0.018 * Math.sin(now / 520) * bob
    const bobRoll = 0.012 * Math.sin(now / 830) * bob
    const bobYaw = 0.05 * Math.sin(now / 1300) * bob

    // The flap swings towards the viewer and up. Its hinge is on the back panel, so once
    // past upright it sits behind the card as the card slides out in front of it. It ends
    // leaning back a little, so its tip never pokes through the card.
    flap.rotation.x = -Math.PI * 1.06 * open
    const behind = clamp01((open - 0.35) / 0.3)
    flap.position.z =
      frontZ + LAYER_GAP + (backZ - LAYER_GAP * 2 - frontZ) * behind
    edges.top.visible = open < 0.3
    flapShadow.visible = open < 0.34

    const exit = easeOut(span(time, [CARD_SETTLE[0] + 0.1, CARD_SETTLE[1]]))
    group.position.y = bobY - ENV_DROP_Y * rise - ENV_EXIT_Y * settle
    group.position.z = -0.35 * settle
    // Face down (address side up) until turned over.
    const yaw = bobYaw + Math.PI * (1 - turn) * turnDirection
    group.rotation.z = bobRoll
    body.rotation.y = yaw
    // The table shadow narrows as the envelope turns on its edge.
    shadow.scale.x = ENV_W * 1.14 * Math.max(0.15, Math.abs(Math.cos(yaw)))
    const opacity = 1 - exit
    for (const m of fadeable) m.opacity = opacity
    flapShadowMaterial.opacity = (1 - clamp01(open * 3)) * opacity
    shadowMaterial.opacity = opacity * (1 - rise * 0.6)
    group.visible = opacity > 0

    const pull =
      SEALED_PULL +
      (RISING_PULL - SEALED_PULL) * rise +
      (1 - RISING_PULL) * settle
    return {
      cardY: bobY + CARD_RISE_Y * rise * (1 - settle),
      // Clear of the pocket, the card lifts towards the viewer a little as it settles.
      cardZ: 0.12 * Math.sin(Math.PI * settle),
      cardRoll: bobRoll + 0.035 * Math.sin(Math.PI * rise) * (1 - settle),
      cardYaw: yaw,
      cameraPull: pull,
      settled: settle,
      cardDepth: CARD_SQUASH + (1 - CARD_SQUASH) * settle,
    }
  }

  return {
    group,
    setLeafCount,
    paintFront,
    pose,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}

/** How far the card inside pushes the envelope out at a point (zero at the edges). */
function pillow(x: number, y: number): number {
  const sx = Math.sin(Math.PI * clamp01(x / ENV_W + 0.5))
  const sy = Math.sin(Math.PI * clamp01(y / ENV_H + 0.5))
  return PILLOW * Math.pow(sx, 0.55) * Math.pow(sy, 0.55)
}

/** Raises a plane's vertices onto the pillow (`yOffset` places it on the envelope). */
function followPillow<T extends BufferGeometry>(
  geometry: T,
  yOffset: number,
  amount: number,
): T {
  const pos = geometry.getAttribute("position")
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(
      i,
      pos.getZ(i) + amount * pillow(pos.getX(i), pos.getY(i) + yOffset),
    )
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function pillowPlane(w: number, h: number, amount: number): PlaneGeometry {
  return followPillow(new PlaneGeometry(w, h, 48, 52), 0, amount)
}

type Pt = [number, number]

/**
 * The top flap's outline as fractions: x across the envelope (0 to 1), y down from the hinge
 * (0 to 1 of the flap's depth). Gently convex edges meet in a rounded tip.
 */
function flapOutline(): Pt[] {
  const pts: Pt[] = []
  const quad = (a: Pt, c: Pt, b: Pt, n: number, from = 0) => {
    for (let i = from; i <= n; i++) {
      const t = i / n
      const m = 1 - t
      pts.push([
        m * m * a[0] + 2 * m * t * c[0] + t * t * b[0],
        m * m * a[1] + 2 * m * t * c[1] + t * t * b[1],
      ])
    }
  }
  quad([0, 0], [0.2, 0.52], [0.43, 0.9], 24)
  quad([0.43, 0.9], [0.5, 1.02], [0.57, 0.9], 12, 1)
  quad([0.57, 0.9], [0.8, 0.52], [1, 0], 24, 1)
  return pts
}

/**
 * The flap as a fine grid over its bounds (its outline is cut from its textures), shaped to
 * lie over the pocket's bulge when closed.
 */
function createFlapGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(ENV_W, FLAP_H, 48, 26)
  geometry.translate(0, -FLAP_H / 2, 0)
  return followPillow(geometry, ENV_H / 2, 1)
}

function canvasTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext("2d") }
}

let grainCanvas: HTMLCanvasElement | null = null
/** A tile of paper grain: fine speckle and a few short fibres. */
function grain(): HTMLCanvasElement {
  if (grainCanvas) return grainCanvas
  const size = 256
  const { canvas, ctx } = makeCanvas(size, size)
  if (ctx) {
    const image = ctx.createImageData(size, size)
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 70
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v
      image.data[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    ctx.lineCap = "round"
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const a = Math.random() * Math.PI * 2
      const len = 4 + Math.random() * 14
      ctx.strokeStyle =
        Math.random() < 0.5
          ? "rgba(90, 70, 50, 0.35)"
          : "rgba(255, 255, 255, 0.4)"
      ctx.lineWidth = 0.6 + Math.random() * 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(
        x + Math.cos(a + 0.6) * len * 0.5,
        y + Math.sin(a + 0.6) * len * 0.5,
        x + Math.cos(a) * len,
        y + Math.sin(a) * len,
      )
      ctx.stroke()
    }
  }
  grainCanvas = canvas
  return canvas
}

/** Lays paper grain over everything drawn so far. */
function addGrain(ctx: CanvasRenderingContext2D, strength = 0.16) {
  const pattern = ctx.createPattern(grain(), "repeat")
  if (!pattern) return
  ctx.save()
  ctx.globalCompositeOperation = "overlay"
  ctx.globalAlpha = strength
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}

/** Soft, uneven tone across the sheet, as in real paper. */
function mottle(ctx: CanvasRenderingContext2D) {
  const { width: w, height: h } = ctx.canvas
  ctx.save()
  for (let i = 0; i < 36; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = (0.15 + Math.random() * 0.3) * Math.max(w, h)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(
      0,
      Math.random() < 0.5
        ? "rgba(255, 252, 245, 0.035)"
        : "rgba(150, 115, 70, 0.022)",
    )
    g.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

/** Clears everything outside the flap's outline (the flap's mesh is a plain grid). */
function cutToFlap(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.globalCompositeOperation = "destination-in"
  tracePath(ctx, flapPx())
  ctx.fillStyle = "#000"
  ctx.fill()
  ctx.restore()
}

function tracePath(ctx: CanvasRenderingContext2D, pts: Pt[], close = true) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1])
  if (close) ctx.closePath()
}

/** A flap shape: from `a` along a gently convex edge to a rounded tip at `tip`, to `b`. */
function foldFlap(a: Pt, tip: Pt, b: Pt, bulge: number, round: number): Pt[] {
  const pts: Pt[] = []
  const lerp = (p: Pt, q: Pt, t: number): Pt => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
  ]
  const edge = (from: Pt, to: Pt, out: number) => {
    const mid = lerp(from, to, 0.5)
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const len = Math.hypot(dx, dy)
    const c: Pt = [mid[0] - (dy / len) * out, mid[1] + (dx / len) * out]
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const m = 1 - t
      pts.push([
        m * m * from[0] + 2 * m * t * c[0] + t * t * to[0],
        m * m * from[1] + 2 * m * t * c[1] + t * t * to[1],
      ])
    }
  }
  const nearTipA = lerp(tip, a, round)
  const nearTipB = lerp(tip, b, round)
  edge(a, nearTipA, bulge)
  for (let i = 1; i < 10; i++) {
    const t = i / 10
    const m = 1 - t
    pts.push([
      m * m * nearTipA[0] + 2 * m * t * tip[0] + t * t * nearTipB[0],
      m * m * nearTipA[1] + 2 * m * t * tip[1] + t * t * nearTipB[1],
    ])
  }
  edge(nearTipB, b, bulge)
  return pts
}

function paintPocket(canvas: HTMLCanvasElement, style: EnvelopeStyle) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const { width: w, height: h } = canvas
  const { paper } = style
  ctx.fillStyle = paper.base
  ctx.fillRect(0, 0, w, h)

  const fill = (pts: Pt[], [from, to]: [string, string], g: [Pt, Pt]) => {
    tracePath(ctx, pts)
    const grad = ctx.createLinearGradient(g[0][0], g[0][1], g[1][0], g[1][1])
    grad.addColorStop(0, from)
    grad.addColorStop(1, to)
    ctx.fillStyle = grad
    ctx.fill()
  }
  const shadowed = (blur: number, dx: number, dy: number, draw: () => void) => {
    ctx.save()
    ctx.shadowColor = `rgba(${paper.shadow}, 0.24)`
    ctx.shadowBlur = blur
    ctx.shadowOffsetX = dx
    ctx.shadowOffsetY = dy
    draw()
    ctx.restore()
  }

  // Side flaps meet just past the middle, each casting a little shadow inwards. The light
  // comes from the upper left, so the right-hand flap is a shade darker.
  const left = foldFlap(
    [0, -h * 0.02],
    [w * 0.54, h * 0.55],
    [0, h * 1.02],
    w * 0.03,
    0.08,
  )
  const right = foldFlap(
    [w, h * 1.02],
    [w * 0.46, h * 0.55],
    [w, -h * 0.02],
    w * 0.03,
    0.08,
  )
  shadowed(w * 0.025, w * 0.006, 0, () =>
    fill(left, paper.sideLit, [
      [0, 0],
      [w * 0.5, h * 0.5],
    ]),
  )
  shadowed(w * 0.025, -w * 0.006, 0, () =>
    fill(right, paper.sideShaded, [
      [w, 0],
      [w * 0.5, h * 0.5],
    ]),
  )
  // The bottom flap folds up over both, its shadow falling upwards onto them.
  const bottom = foldFlap(
    [-w * 0.02, h],
    [w * 0.5, h * 0.43],
    [w * 1.02, h],
    w * 0.025,
    0.1,
  )
  shadowed(w * 0.035, 0, -w * 0.01, () =>
    fill(bottom, paper.bottom, [
      [0, h * 0.45],
      [0, h],
    ]),
  )
  // A crisp light edge where the bottom flap's paper turns.
  tracePath(ctx, bottom, false)
  ctx.strokeStyle = `rgba(255, 255, 255, ${paper.highlight})`
  ctx.lineWidth = w * 0.0025
  ctx.stroke()

  mottle(ctx)
  addGrain(ctx)

  // The opening: above where the side flaps meet, the pocket is open and the card inside
  // shows through. Keep only the flaps, then let them cast a soft shadow into the opening.
  const flaps = () => {
    ctx.beginPath()
    for (const pts of [left, right, bottom]) {
      ctx.moveTo(pts[0][0], pts[0][1])
      for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1])
      ctx.closePath()
    }
  }
  ctx.save()
  ctx.globalCompositeOperation = "destination-in"
  flaps()
  ctx.fillStyle = "#000"
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.globalCompositeOperation = "destination-over"
  const off = w * 3
  ctx.translate(-off, 0)
  ctx.shadowColor = `rgba(${paper.shadow}, 0.35)`
  ctx.shadowBlur = w * 0.03
  ctx.shadowOffsetX = off
  ctx.shadowOffsetY = -w * 0.008
  flaps()
  ctx.fillStyle = "#000"
  ctx.fill()
  ctx.restore()
}

/** The address side: the recipient's name handwritten in the middle, a stamp and postmark. */
function paintAddress(
  canvas: HTMLCanvasElement,
  style: EnvelopeStyle,
  recipientName: string,
  fontFamily: string,
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = style.paper.base
  ctx.fillRect(0, 0, w, h)
  // The card inside lifts the middle a touch towards the light.
  const swell = ctx.createRadialGradient(
    w * 0.42,
    h * 0.42,
    w * 0.05,
    w * 0.5,
    h * 0.5,
    w * 0.8,
  )
  swell.addColorStop(0, "rgba(255, 255, 255, 0.1)")
  swell.addColorStop(1, `rgba(${style.paper.shadow}, 0.08)`)
  ctx.fillStyle = swell
  ctx.fillRect(0, 0, w, h)
  mottle(ctx)
  addGrain(ctx)

  paintStamp(ctx, style, w * 0.79, h * 0.12, w * 0.15)

  const text = `For ${recipientName}`
  let size = w * 0.14
  ctx.font = `700 ${size}px ${fontFamily}`
  const maxWidth = w * 0.74
  const measured = ctx.measureText(text).width
  if (measured > maxWidth) {
    size *= maxWidth / measured
    ctx.font = `700 ${size}px ${fontFamily}`
  }
  ctx.save()
  ctx.translate(w * 0.5, h * 0.52)
  ctx.rotate(-0.035)
  ctx.globalCompositeOperation = style.ink.blend
  ctx.fillStyle = style.ink.color
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

/** The CardShare.ai logo's coral and its four-point star (in a 100-unit square). */
const STAMP_CORAL = "#ff5a4a"
const STAR_PATH =
  "M50 0C54.2 29.2 70.8 45.8 100 50C70.8 54.2 54.2 70.8 50 100C45.8 70.8 29.2 54.2 0 50C29.2 45.8 45.8 29.2 50 0Z"

/** A perforated postage stamp of the CardShare.ai logo, and a wavy postmark running off it. */
function paintStamp(
  ctx: CanvasRenderingContext2D,
  style: EnvelopeStyle,
  cx: number,
  cy: number,
  width: number,
) {
  const height = width * 1.2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(0.04)
  // White stamp paper with a perforated edge, lifted slightly off the envelope.
  ctx.shadowColor = `rgba(${style.paper.shadow}, 0.3)`
  ctx.shadowBlur = width * 0.06
  ctx.shadowOffsetY = width * 0.02
  ctx.fillStyle = "#fbf8f2"
  ctx.fillRect(-width / 2, -height / 2, width, height)
  ctx.shadowColor = "transparent"
  ctx.globalCompositeOperation = "destination-out"
  const hole = width * 0.035
  for (let i = 0; i <= 10; i++) {
    const x = -width / 2 + (i / 10) * width
    const y = -height / 2 + (i / 10) * height
    for (const [px, py] of [
      [x, -height / 2],
      [x, height / 2],
      [-width / 2, y],
      [width / 2, y],
    ]) {
      ctx.beginPath()
      ctx.arc(px, py, hole, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = "source-over"
  // The picture: the CardShare.ai mark, engraved like a printed stamp.
  const inset = width * 0.1
  const fx = -width / 2 + inset
  const fy = -height / 2 + inset
  const fw = width - inset * 2
  const fh = height - inset * 2.6
  ctx.fillStyle = STAMP_CORAL
  ctx.fillRect(fx, fy, fw, fh)
  ctx.save()
  ctx.beginPath()
  ctx.rect(fx, fy, fw, fh)
  ctx.clip()
  // Fine engraved rays behind the star.
  const starY = fy + fh * 0.5
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)"
  ctx.lineWidth = width * 0.008
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * width * 0.12, starY + Math.sin(a) * width * 0.12)
    ctx.lineTo(Math.cos(a) * width, starY + Math.sin(a) * width)
    ctx.stroke()
  }
  ctx.restore()
  // The star itself (the logo's path, 100 units square).
  const starSize = fw * 0.62
  ctx.save()
  ctx.translate(-starSize / 2, starY - starSize / 2)
  ctx.scale(starSize / 100, starSize / 100)
  ctx.fillStyle = "#ffffff"
  ctx.fill(new Path2D(STAR_PATH))
  ctx.restore()
  // A fine frame line inside the picture, a value and the name, as on a real stamp.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"
  ctx.lineWidth = width * 0.012
  ctx.strokeRect(
    fx + width * 0.035,
    fy + width * 0.035,
    fw - width * 0.07,
    fh - width * 0.07,
  )
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.font = `700 ${width * 0.12}px sans-serif`
  ctx.fillText("1st", fx + width * 0.07, fy + width * 0.06)
  ctx.fillStyle = STAMP_CORAL
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${width * 0.085}px sans-serif`
  ctx.fillText("CARDSHARE.AI", 0, fy + fh + (height / 2 - (fy + fh)) * 0.5)
  ctx.restore()

  // Postmark: a ring and wavy lines in faded ink, partly over the stamp.
  ctx.save()
  ctx.globalCompositeOperation = style.ink.blend
  ctx.strokeStyle = style.ink.color
  ctx.globalAlpha = 0.35
  ctx.lineWidth = width * 0.025
  ctx.beginPath()
  ctx.arc(cx - width * 0.62, cy + height * 0.12, width * 0.36, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    const y0 = cy + height * 0.12 + i * width * 0.13
    for (let x = 0; x <= width * 1.5; x += 4) {
      const px = cx - width * 0.45 + x
      const py = y0 + Math.sin(x / (width * 0.12)) * width * 0.035
      if (x === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function paintBackPanel(style: EnvelopeStyle): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(256, Math.round((256 * ENV_H) / ENV_W))
  if (ctx) {
    ctx.fillStyle = style.paper.edge
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    mottle(ctx)
    addGrain(ctx)
  }
  return canvas
}

const FLAP_TEX_W = 1024
const FLAP_TEX_H = Math.round((FLAP_TEX_W * FLAP_H) / ENV_W)
const flapPx = (): Pt[] =>
  flapOutline().map(([u, d]) => [u * FLAP_TEX_W, d * FLAP_TEX_H])

function paintFlapOuter(style: EnvelopeStyle): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FLAP_TEX_W, FLAP_TEX_H)
  if (ctx) {
    const { paper } = style
    const g = ctx.createLinearGradient(0, 0, FLAP_TEX_W * 0.3, FLAP_TEX_H)
    g.addColorStop(0, paper.flap[0])
    g.addColorStop(1, paper.flap[1])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, FLAP_TEX_W, FLAP_TEX_H)
    // The crease along the hinge.
    const crease = ctx.createLinearGradient(0, 0, 0, FLAP_TEX_H * 0.06)
    crease.addColorStop(0, `rgba(${paper.shadow}, 0.24)`)
    crease.addColorStop(1, `rgba(${paper.shadow}, 0)`)
    ctx.fillStyle = crease
    ctx.fillRect(0, 0, FLAP_TEX_W, FLAP_TEX_H * 0.06)
    // A fine highlight just inside the cut edge, where the paper catches the light.
    ctx.save()
    tracePath(ctx, flapPx())
    ctx.clip()
    tracePath(ctx, flapPx(), false)
    ctx.strokeStyle = `rgba(255, 255, 255, ${paper.highlight})`
    ctx.lineWidth = 7
    ctx.stroke()
    ctx.strokeStyle = `rgba(${paper.shadow}, 0.3)`
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.restore()
    mottle(ctx)
    addGrain(ctx)
    cutToFlap(ctx)
  }
  return canvas
}

/** The flap's inside: a patterned liner inset from a paper margin. */
function paintFlapInner(style: EnvelopeStyle): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FLAP_TEX_W, FLAP_TEX_H)
  if (ctx) {
    const { liner } = style
    ctx.fillStyle = liner.margin
    ctx.fillRect(0, 0, FLAP_TEX_W, FLAP_TEX_H)
    // The liner: the flap's shape, shrunk towards its middle.
    const cx = FLAP_TEX_W / 2
    const cy = FLAP_TEX_H * 0.35
    const inset = flapPx().map(([x, y]): Pt => [
      cx + (x - cx) * 0.92,
      cy + (y - cy) * 0.88 + 6,
    ])
    ctx.save()
    tracePath(ctx, inset)
    ctx.clip()
    ctx.fillStyle = liner.base
    ctx.fillRect(0, 0, FLAP_TEX_W, FLAP_TEX_H)
    ctx.fillStyle = liner.motif
    ctx.strokeStyle = liner.motif
    paintLinerPattern(ctx, liner.pattern)
    ctx.restore()
    // Crease along the hinge.
    const crease = ctx.createLinearGradient(0, 0, 0, FLAP_TEX_H * 0.08)
    crease.addColorStop(0, `rgba(${style.paper.shadow}, 0.3)`)
    crease.addColorStop(1, `rgba(${style.paper.shadow}, 0)`)
    ctx.fillStyle = crease
    ctx.fillRect(0, 0, FLAP_TEX_W, FLAP_TEX_H * 0.08)
    addGrain(ctx, 0.2)
    cutToFlap(ctx)
  }
  return canvas
}

function paintLinerPattern(
  ctx: CanvasRenderingContext2D,
  pattern: EnvelopeStyle["liner"]["pattern"],
) {
  const step = 64
  if (pattern === "stripes") {
    // Fine ticking stripes, a pair every so often.
    for (let x = -FLAP_TEX_H; x < FLAP_TEX_W + FLAP_TEX_H; x += 36) {
      ctx.lineWidth = x % 108 === 0 ? 7 : 2.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, FLAP_TEX_H)
      ctx.stroke()
    }
    return
  }
  for (let y = 0, row = 0; y < FLAP_TEX_H + step; y += step * 0.75, row++) {
    for (let x = 0, col = 0; x < FLAP_TEX_W + step; x += step, col++) {
      const px = x + (row % 2 ? step / 2 : 0)
      const big = (row + col) % 3 === 0
      if (pattern === "hearts") {
        if (big) heart(ctx, px, y, 10)
        else dot(ctx, px, y, 3.5)
      } else if (pattern === "stars") {
        if (big) star(ctx, px, y, 9)
        else dot(ctx, px, y, 2)
      } else {
        if (big) flower(ctx, px, y, 11)
        else dot(ctx, px, y, 2.5)
      }
    }
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.42 : r
    const px = x + Math.cos(a) * rr
    const py = y + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function flower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5
    ctx.beginPath()
    ctx.ellipse(
      x + Math.cos(a) * r * 0.55,
      y + Math.sin(a) * r * 0.55,
      r * 0.42,
      r * 0.28,
      a,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.save()
  ctx.globalAlpha = 0.6
  dot(ctx, x, y, r * 0.22)
  ctx.restore()
}

/** The closed flap's shadow on the pocket, a little below and softer than the flap. */
function paintFlapShadow(): HTMLCanvasElement {
  const h = Math.round(FLAP_TEX_H * (1 + FLAP_SHADOW_PAD))
  const { canvas, ctx } = makeCanvas(FLAP_TEX_W / 2, h / 2)
  if (ctx) {
    ctx.scale(0.5, 0.5)
    const off = FLAP_TEX_W * 3
    // Draw the flap off-canvas so only its blurred shadow lands (canvas filters aren't
    // everywhere yet).
    ctx.shadowColor = "rgba(60, 40, 20, 0.6)"
    ctx.shadowBlur = 14
    ctx.shadowOffsetX = off
    ctx.shadowOffsetY = FLAP_TEX_H * 0.03
    tracePath(
      ctx,
      flapPx().map(([x, y]): Pt => [x - off, y]),
    )
    ctx.fillStyle = "#000"
    ctx.fill()
  }
  return canvas
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + r * 0.9)
  ctx.bezierCurveTo(
    x - r * 1.6,
    y - r * 0.1,
    x - r * 0.7,
    y - r * 1.3,
    x,
    y - r * 0.45,
  )
  ctx.bezierCurveTo(
    x + r * 0.7,
    y - r * 1.3,
    x + r * 1.6,
    y - r * 0.1,
    x,
    y + r * 0.9,
  )
  ctx.fill()
}
