"use client"

import { Button } from "@/components/ui/button"
import { CardCanvasScaleContext } from "@/components/card-3d/canvas-scale-context"
import { computeNaturalPageSpread } from "@/components/card-3d/card-page-spread"
import {
  bookCenterOffset,
  buildBookFaces,
  leafCountForFaces,
  leafProgress,
  openness,
  PAGE_CURL_RADIANS,
  settleFlipTarget,
  spreadForPage,
} from "@/lib/card-book"
import type { Contribution } from "@/lib/card-body"
import { MESSAGE_FONT_PRESETS } from "@/lib/message-font-presets"
import { mapBoxPoint, quadToMatrix3d, type Point2 } from "@/lib/quad-transform"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, Pencil, Plus } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import {
  BoxGeometry,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import {
  buildNotesByPage,
  faceHasGif,
  faceImageUrls,
  faceSignature,
  paintFace,
  PAGE_HEIGHT_PX,
  PAGE_TEXTURE_SCALE,
  PAGE_WIDTH_PX,
  type BookContent,
} from "./page-painter"
import {
  createPageMaterial,
  LEAF_THICKNESS,
  type PageMaterial,
} from "./page-shader"

/** World units: one page is 1 wide; height keeps the 4:5 card ratio. */
const PAGE_W = 1
const PAGE_H = (PAGE_W * PAGE_HEIGHT_PX) / PAGE_WIDTH_PX
/** Gap between stacked leaves so they never z-fight. */
const LEAF_GAP = LEAF_THICKNESS + 0.0015
/** Gloss on the printed covers; inside pages are matte card stock. */
const COVER_GLOSS = 0.35
const PAGE_GLOSS = 0.03
/** How far the camera swings round a closed card so its thickness shows. */
const CLOSED_YAW = 0.32
/**
 * An open card rests with its pages angled up slightly (radians, as a fraction of a half
 * turn), like a card standing open on a table. Pages settle a little while one is edited.
 */
const REST_FOLD = 0.085
/** Share of the rest fold removed while editing. */
const EDIT_FLATTEN = 0.5
/**
 * While editing, the camera looks at the page from a little off its normal (towards the spine
 * and from above) so it still reads as a card, not a flat form.
 */
const EDIT_YAW = 0.26
const EDIT_PITCH = 0.14
/** Room around the edited page, as a multiple of its size. */
const EDIT_FRAME_W = 1.2
const EDIT_FRAME_H = 1.16
/**
 * Focus in these counts as still editing: side panels that format the selected note (marked
 * by the host) and popups the editor portals out of the card.
 */
const EDITOR_CHROME_SELECTOR =
  '[data-card-editor-chrome],[role="dialog"],[data-regenerate-area],[data-radix-popper-content-wrapper]'
/** Peak darkening a lifted page casts on the page beneath it. */
const TURN_SHADOW = 0.38
const CAMERA_FOV = 30
const FRAME_MARGIN_W = 1.14
const FRAME_MARGIN_H = 1.2
const DRAG_THRESHOLD_PX = 8
/** Horizontal drag distance (in page widths) for one full turn. */
const DRAG_PAGES_PER_TURN = 1.6
/** GIF frames are re-uploaded as whole page textures, so keep the rate modest. */
const GIF_REPAINT_MS = 150

type Side = "left" | "right"

/** Stable default: a fresh `[]` per render would rebuild content (and re-run effects) forever. */
const NO_CONTRIBUTIONS: Contribution[] = []

export type CardBook3DProps = {
  imageUrl: string
  headline: string
  /** Legacy centred message (cards without a creator contribution). */
  message: string
  recipientName: string
  contributions?: Contribution[]
  extraPages?: number
  messageFontSize?: number
  /** Inside page that carries the creator message (matches `Card3D`). */
  messagePageIndex?: number
  /** Card page to open at (0 = cover). */
  initialPage?: number
  /** Turn to this card page whenever the value changes (0 = cover). */
  navigateToPage?: number
  /**
   * Makes the card editable in place. Clicking a page swings the camera round to face it and
   * this editor (one page of the flat card, embedded) is laid exactly over the 3D page.
   */
  renderPageEditor?: (args: PageEditorArgs) => ReactNode
  /** Page to open for editing when the card mounts (e.g. a note still to be placed). */
  autoEditPage?: number
  /** Adds a page after the last one; offered on the pager while editing the last page. */
  onAddPage?: () => void | Promise<void>
  /** Card page the reader is looking at (left page of an open spread on wide screens). */
  onPageChange?: (page: number) => void
  /** Only the cover exists yet (create flow): a single leaf with a back. */
  coverOnly?: boolean
  className?: string
  /** Rendered instead of the 3D card when WebGL is unavailable. */
  fallback?: ReactNode
}

export type PageEditorArgs = {
  /** Card page being edited (0 = cover). */
  page: number
  /** Exact on-screen size of the page in CSS px (4:5). */
  width: number
  height: number
  /** Call when the editor moves to another page so the 3D card follows. */
  onPageChange: (page: number) => void
}

type Leaf = { mesh: Mesh; material: PageMaterial }

/** A point on a page as fractions of its width and height from the top-left. */
type PagePoint = { u: number; v: number }

type SceneHandle = {
  faceCanvases: HTMLCanvasElement[]
  faceTextures: CanvasTexture[]
  /** Where a screen point lands on the visible page on `side`, if it does. */
  pickPage: (clientX: number, clientY: number, side: Side) => PagePoint | null
}

/** Mutable per-frame state the render loop reads without re-rendering React. */
type LiveState = {
  flip: number
  target: number
  focus: Side
  narrow: boolean
  reducedMotion: boolean
  camX: number
  fitW: number
  tilt: { x: number; y: number }
  tiltTarget: { x: number; y: number }
  dirty: boolean
  /** A page is open for editing: the camera closes in on it and the editor is mapped onto it. */
  editing: boolean
  /** 0 = browsing camera, 1 = editing camera (eased). */
  editBlend: number
  /** Container size in CSS px, for projecting the edited page to the screen. */
  viewW: number
  viewH: number
  overlayReady: boolean
  /** On-screen px per editor px last reported to React. */
  editScale: number
  /** The edited page's corners on screen (container px), last frame. */
  editQuad: [Point2, Point2, Point2, Point2] | null
  pointer: {
    id: number
    startX: number
    startFlip: number
    lastX: number
    lastT: number
    velocity: number
    dragging: boolean
  } | null
}

/**
 * A greeting card rendered with Three.js: leaves hinge on a spine and can be turned by
 * dragging, clicking either half, the arrow keys, or the controls underneath.
 *
 * With `renderPageEditor` the card is edited in place: clicking a page swings the camera to
 * face it and the flat editor for that page is laid exactly over it. Content changes repaint
 * the 3D pages live.
 */
export function CardBook3D({
  imageUrl,
  headline,
  message,
  recipientName,
  contributions = NO_CONTRIBUTIONS,
  extraPages = 0,
  messageFontSize = 18,
  messagePageIndex = 1,
  initialPage = 0,
  coverOnly = false,
  navigateToPage,
  onPageChange,
  renderPageEditor,
  autoEditPage,
  onAddPage,
  className,
  fallback = null,
}: CardBook3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageHostRef = useRef<HTMLDivElement>(null)
  const fontProbeRef = useRef<HTMLSpanElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const paintFaceRef = useRef<(faceIndex: number) => void>(() => {})
  /** Signature each face was last painted with; cleared when the scene is rebuilt. */
  const paintedRef = useRef<Map<number, string>>(new Map())
  const gifFacesRef = useRef<number[]>([])

  const [webglFailed, setWebglFailed] = useState(false)
  const editable = Boolean(renderPageEditor)
  const [editPage, setEditPage] = useState<number | null>(
    editable && autoEditPage !== undefined ? autoEditPage : null,
  )
  const [overlayReady, setOverlayReady] = useState(false)
  const [editScale, setEditScale] = useState(1)
  /** The editor element, mapped onto the 3D page every frame by the render loop. */
  const editorRef = useRef<HTMLDivElement>(null)
  const startPage = editPage ?? initialPage
  const initialFlip = coverOnly ? 0 : spreadForPage(startPage)
  const initialFocus: Side = startPage % 2 === 1 ? "left" : "right"
  const [flipTarget, setFlipTarget] = useState(initialFlip)
  const [focus, setFocus] = useState<Side>(initialFocus)
  const [prevNavigateToPage, setPrevNavigateToPage] = useState(navigateToPage)
  if (navigateToPage !== prevNavigateToPage) {
    setPrevNavigateToPage(navigateToPage)
    if (navigateToPage !== undefined && !coverOnly) {
      setFlipTarget(spreadForPage(navigateToPage))
      setFocus(navigateToPage % 2 === 1 ? "left" : "right")
      // On editing surfaces, navigating (e.g. from a side panel) opens that page to edit.
      if (editable) setEditPage(navigateToPage)
    }
  }
  const [narrow, setNarrow] = useState(false)
  const [fontsVersion, setFontsVersion] = useState(0)

  const live = useRef<LiveState>({
    flip: initialFlip,
    target: initialFlip,
    focus: initialFocus,
    narrow: false,
    reducedMotion: false,
    camX: initialFlip === 0 ? PAGE_W / 2 : 0,
    fitW: PAGE_W,
    tilt: { x: 0, y: 0 },
    tiltTarget: { x: 0, y: 0 },
    dirty: true,
    editing: editPage !== null,
    editBlend: editPage !== null ? 1 : 0,
    viewW: 0,
    viewH: 0,
    overlayReady: false,
    editScale: 1,
    editQuad: null,
    pointer: null,
  })

  const { totalPages, validMessagePage } = useMemo(
    () =>
      coverOnly
        ? { totalPages: 1, validMessagePage: -1 }
        : computeNaturalPageSpread(
            false,
            messagePageIndex,
            contributions,
            extraPages,
          ),
    [coverOnly, messagePageIndex, contributions, extraPages],
  )
  const faces = useMemo(() => buildBookFaces(totalPages), [totalPages])
  const leafCount = leafCountForFaces(faces)

  const content = useMemo<BookContent>(
    () => ({
      imageUrl,
      headline,
      recipientName,
      bodyMessage: message,
      messagePage: validMessagePage,
      notesByPage: buildNotesByPage(
        contributions,
        validMessagePage,
        messageFontSize,
      ),
    }),
    [
      imageUrl,
      headline,
      recipientName,
      message,
      validMessagePage,
      contributions,
      messageFontSize,
    ],
  )

  const imageUrls = useMemo(
    () => [...new Set(faces.flatMap((f) => faceImageUrls(f, content)))],
    [faces, content],
  )
  const images = useLoadedImages(imageUrls, imageHostRef)

  const fontFamily = useCallback((presetId: string | null) => {
    const probe = fontProbeRef.current
    const base = probe ? getComputedStyle(probe).fontFamily : "sans-serif"
    const preset = MESSAGE_FONT_PRESETS.find((p) => p.id === presetId)
    if (!probe || !preset?.cssVar) return base
    const resolved = getComputedStyle(probe)
      .getPropertyValue(preset.cssVar)
      .trim()
    return resolved ? `${resolved}, ${base}` : base
  }, [])

  // Canvas text only uses a web font once it has loaded; repaint when they arrive. Keyed on
  // the preset ids in use so ordinary edits do not restart font loading.
  const fontPresetKey = useMemo(() => {
    const ids = new Set<string>()
    for (const notes of content.notesByPage.values()) {
      for (const n of notes) ids.add(n.fontPresetId ?? "")
    }
    return [...ids].sort().join(",")
  }, [content])
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return
    let cancelled = false
    const families = new Set<string>([fontFamily(null)])
    for (const id of fontPresetKey.split(",")) {
      families.add(fontFamily(id || null))
    }
    const loads = [...families].flatMap((family) => [
      document.fonts.load(`400 18px ${family}`),
      document.fonts.load(`700 30px ${family}`),
    ])
    void Promise.allSettled([...loads, document.fonts.ready]).then(() => {
      if (!cancelled) setFontsVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [fontPresetKey, fontFamily])

  useEffect(() => {
    live.current.target = flipTarget
    live.current.focus = focus
    live.current.dirty = true
  }, [flipTarget, focus])

  useEffect(() => {
    live.current.narrow = narrow
    live.current.dirty = true
  }, [narrow])

  useEffect(() => {
    live.current.editing = editPage !== null
    live.current.dirty = true
  }, [editPage])

  // Keep the target in range when the page count changes.
  useEffect(() => {
    if (flipTarget > leafCount) {
      queueMicrotask(() => setFlipTarget(leafCount))
    }
  }, [flipTarget, leafCount])

  // ── Scene setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      queueMicrotask(() => setWebglFailed(true))
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    container.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50)
    const state = live.current
    const leafTotal = leafCountForFaces(faces)
    state.flip = Math.min(state.flip, leafTotal)
    state.target = Math.min(state.target, leafTotal)
    state.dirty = true

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    )
    state.reducedMotion = reducedMotionQuery.matches
    const onReducedMotion = () => {
      state.reducedMotion = reducedMotionQuery.matches
    }
    reducedMotionQuery.addEventListener("change", onReducedMotion)

    const anisotropy = renderer.capabilities.getMaxAnisotropy()
    const faceCanvases = faces.map(() => {
      const canvas = document.createElement("canvas")
      canvas.width = PAGE_WIDTH_PX * PAGE_TEXTURE_SCALE
      canvas.height = PAGE_HEIGHT_PX * PAGE_TEXTURE_SCALE
      return canvas
    })
    const faceTextures = faceCanvases.map((canvas) => {
      const texture = new CanvasTexture(canvas)
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = anisotropy
      return texture
    })
    paintedRef.current = new Map()

    // A thin box so pages have real edges; the shader bends it around the spine.
    const leafGeometry = new BoxGeometry(
      PAGE_W,
      PAGE_H,
      LEAF_THICKNESS,
      48,
      1,
      1,
    )
    leafGeometry.translate(PAGE_W / 2, 0, 0)
    const leaves: Leaf[] = []
    for (let i = 0; i < leafTotal; i++) {
      const material = createPageMaterial(
        faceTextures[i * 2],
        faceTextures[i * 2 + 1],
        PAGE_W,
        {
          front: i === 0 ? COVER_GLOSS : PAGE_GLOSS,
          back: i === leafTotal - 1 ? COVER_GLOSS : PAGE_GLOSS,
        },
      )
      const mesh = new Mesh(leafGeometry, material)
      // Vertices move in the shader; the static bounds would cull turning pages.
      mesh.frustumCulled = false
      scene.add(mesh)
      leaves.push({ mesh, material })
    }

    const shadowTexture = createShadowTexture()
    const shadowMaterial = new MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    })
    const shadowGeometry = new PlaneGeometry(1, 1)
    const shadow = new Mesh(shadowGeometry, shadowMaterial)
    shadow.position.z = -LEAF_GAP * (leafTotal + 2)
    shadow.renderOrder = -1
    scene.add(shadow)

    const resize = () => {
      const { width, height } = container.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      setNarrow(width / height < 1)
      state.viewW = width
      state.viewH = height
      state.dirty = true
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    const projected = new Vector3()
    const raycaster = new Raycaster()
    // Pages lie close enough to flat at rest to pick them as planes.
    const pickPage = (
      clientX: number,
      clientY: number,
      side: Side,
    ): PagePoint | null => {
      const rect = container.getBoundingClientRect()
      const leaf = side === "right" ? state.target : state.target - 1
      const u = leaves[leaf]?.material.uniforms
      if (!u || rect.width <= 0 || rect.height <= 0) return null
      const page = editedPageFrame(u.uProgress.value, u.uLift.value, side)
      const origin = page.at(0, 0)
      const across = page.at(1, 0).sub(origin)
      const down = page.at(0, 1).sub(origin)
      const normal = new Vector3().crossVectors(across, down)
      raycaster.setFromCamera(
        new Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      const { ray } = raycaster
      const denom = normal.dot(ray.direction)
      if (Math.abs(denom) < 1e-9) return null
      const t = normal.dot(origin.clone().sub(ray.origin)) / denom
      if (t < 0) return null
      const hit = ray.origin
        .clone()
        .addScaledVector(ray.direction, t)
        .sub(origin)
      const point = {
        u: hit.dot(across) / across.lengthSq(),
        v: hit.dot(down) / down.lengthSq(),
      }
      return point.u >= 0 && point.u <= 1 && point.v >= 0 && point.v <= 1
        ? point
        : null
    }
    sceneRef.current = { faceCanvases, faceTextures, pickPage }
    let frame = 0
    let last = performance.now()
    let lastGifPaint = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      let moving = state.dirty
      state.dirty = false

      // Turn toward the target spread (drags set `flip` directly).
      if (!state.pointer?.dragging) {
        const diff = state.target - state.flip
        if (Math.abs(diff) > 1e-4) {
          const rate = state.reducedMotion ? 30 : 5
          const eased = diff * (1 - Math.exp(-dt * rate))
          const minStep = Math.min(Math.abs(diff), dt * 0.6)
          state.flip += Math.sign(diff) * Math.max(Math.abs(eased), minStep)
          moving = true
        } else {
          state.flip = state.target
        }
      }

      // The leaf mid-turn shades the page it is lifting off and the one it is landing on.
      const turningLeaf = Math.floor(state.flip)
      const turnT = state.flip - turningLeaf
      const lift = Math.sin(Math.PI * turnT)
      // Ease between browsing and the head-on editing camera.
      const editGoal = state.editing ? 1 : 0
      if (Math.abs(editGoal - state.editBlend) > 0.002) {
        const rate = state.reducedMotion ? 30 : 5
        state.editBlend +=
          (editGoal - state.editBlend) * (1 - Math.exp(-dt * rate))
        moving = true
      } else if (state.editBlend !== editGoal) {
        state.editBlend = editGoal
        moving = true
      }

      // The page being edited (or about to be): the focused side of the target spread.
      const editSide: Side =
        state.target <= 0
          ? "right"
          : state.target >= leafTotal
            ? "left"
            : state.focus
      const editLeaf = editSide === "right" ? state.target : state.target - 1

      // Open pages rest slightly raised off the table, settling a little for editing.
      const fold =
        REST_FOLD *
        openness(state.flip, leafTotal) *
        (1 - EDIT_FLATTEN * state.editBlend)
      leaves.forEach(({ material }, i) => {
        const p = leafProgress(state.flip, i)
        const u = material.uniforms
        u.uProgress.value = fold + p * (1 - 2 * fold)
        const restZ = -i * LEAF_GAP
        const turnedZ = -(leafTotal - 1 - i) * LEAF_GAP
        u.uLift.value = restZ + (turnedZ - restZ) * p
        u.uShadowFront.value =
          i === turningLeaf + 1 ? TURN_SHADOW * lift * (1 - turnT) : 0
        u.uShadowBack.value =
          i === turningLeaf - 1 ? TURN_SHADOW * lift * turnT : 0
        // The edited page lies flat so the editor maps onto it exactly.
        u.uCurl.value =
          i === editLeaf
            ? PAGE_CURL_RADIANS * (1 - state.editBlend)
            : PAGE_CURL_RADIANS
      })

      // Frame the visible pages: the whole spread on wide screens, one page on narrow ones.
      let targetX: number
      let targetFitW: number
      if (state.narrow) {
        const t = state.pointer?.dragging ? state.flip : state.target
        const side: Side =
          t <= 0 ? "right" : t >= leafTotal ? "left" : state.focus
        targetX = side === "right" ? PAGE_W / 2 : -PAGE_W / 2
        targetFitW = PAGE_W
      } else {
        // Frame where the turn is heading so a lifting page stays in view.
        const t = state.pointer?.dragging ? state.flip : state.target
        targetX = -bookCenterOffset(t, leafTotal) * PAGE_W
        targetFitW =
          PAGE_W *
          (1 +
            Math.max(openness(t, leafTotal), openness(state.flip, leafTotal)))
      }
      const follow = 1 - Math.exp(-dt * (state.reducedMotion ? 30 : 6))
      if (
        Math.abs(targetX - state.camX) > 1e-4 ||
        Math.abs(targetFitW - state.fitW) > 1e-4
      ) {
        state.camX += (targetX - state.camX) * follow
        state.fitW += (targetFitW - state.fitW) * follow
        moving = true
      }

      const tiltTarget =
        state.reducedMotion || state.editing ? { x: 0, y: 0 } : state.tiltTarget
      const tiltFollow = 1 - Math.exp(-dt * 4)
      if (
        Math.abs(tiltTarget.x - state.tilt.x) > 1e-4 ||
        Math.abs(tiltTarget.y - state.tilt.y) > 1e-4
      ) {
        state.tilt.x += (tiltTarget.x - state.tilt.x) * tiltFollow
        state.tilt.y += (tiltTarget.y - state.tilt.y) * tiltFollow
        moving = true
      }

      // Animated GIFs: repaint the faces near the current spread.
      // While a page is open for editing the DOM editor shows the live GIFs instead.
      const gifFaces = state.editing ? [] : gifFacesRef.current
      if (gifFaces.length > 0 && now - lastGifPaint > GIF_REPAINT_MS) {
        lastGifPaint = now
        const lo = Math.floor(state.flip) * 2 - 1
        const hi = Math.ceil(state.flip) * 2 + 1
        for (const index of gifFaces) {
          if (index >= lo && index <= hi) {
            paintFaceRef.current(index)
            moving = true
          }
        }
      }

      if (!moving) {
        if (state.overlayReady !== (state.editing && state.editBlend === 1)) {
          state.dirty = true
        }
        return
      }

      // Only pages lying flat cast the ground shadow; a lifting page grows it as it lands.
      const settled = (t: number) =>
        t >= 1 ? 1 : Math.max(0, Math.min(1, (t - 0.75) / 0.25)) ** 2
      const left = -settled(state.flip) * PAGE_W
      const right = settled(leafTotal - state.flip) * PAGE_W
      const shadowWidth = Math.max(0.001, right - left)
      shadow.position.x = (left + right) / 2
      shadow.position.y = -0.02
      shadow.scale.set(shadowWidth * 1.12 + 0.04, PAGE_H * 1.12, 1)

      const halfFov = (CAMERA_FOV * Math.PI) / 360
      const distH = (PAGE_H * FRAME_MARGIN_H) / 2 / Math.tan(halfFov)
      const distW =
        (state.fitW * FRAME_MARGIN_W) / 2 / (Math.tan(halfFov) * camera.aspect)
      // Pull back a little mid-turn: the lifted page is closer to the camera and looks larger.
      const turning = Math.sin(Math.PI * (state.flip - Math.floor(state.flip)))
      const distance = Math.max(distH, distW) * (1 + 0.2 * turning)
      // A closed card is seen a little from the side (and from above) so it reads as an object.
      const closed = 1 - openness(state.flip, leafTotal)
      const closedSide = state.flip < leafTotal / 2 ? 1 : -1
      const yaw = state.tilt.x * 0.22 + CLOSED_YAW * closed * closedSide
      const pitch = 0.08 + 0.1 * closed - state.tilt.y * 0.12
      const browseX = state.camX + distance * Math.sin(yaw) * Math.cos(pitch)
      const browseY = distance * Math.sin(pitch)
      const browseZ = distance * Math.cos(yaw) * Math.cos(pitch)

      // Editing camera: close in on the edited page, seen a little from the side and above.
      const edited = leaves[editLeaf]?.material.uniforms
      const page = edited
        ? editedPageFrame(edited.uProgress.value, edited.uLift.value, editSide)
        : null
      const b = state.editBlend * state.editBlend * (3 - 2 * state.editBlend)
      const mix = (a: number, c: number) => a + (c - a) * b
      if (page) {
        const editDistance = Math.max(
          (PAGE_H * EDIT_FRAME_H) / 2 / Math.tan(halfFov),
          (PAGE_W * EDIT_FRAME_W) / 2 / (Math.tan(halfFov) * camera.aspect),
        )
        // Swing the page normal towards the spine, then raise it.
        const yaw = editSide === "right" ? -EDIT_YAW : EDIT_YAW
        const nx = page.normal.x * Math.cos(yaw) + page.normal.z * Math.sin(yaw)
        const nz =
          -page.normal.x * Math.sin(yaw) + page.normal.z * Math.cos(yaw)
        const view = new Vector3(
          nx * Math.cos(EDIT_PITCH),
          Math.sin(EDIT_PITCH),
          nz * Math.cos(EDIT_PITCH),
        )
        const c = page.center
        camera.position.set(
          mix(browseX, c.x + view.x * editDistance),
          mix(browseY, c.y + view.y * editDistance),
          mix(browseZ, c.z + view.z * editDistance),
        )
        camera.lookAt(mix(state.camX, c.x), mix(0, c.y), mix(0, c.z))
      } else {
        camera.position.set(browseX, browseY, browseZ)
        camera.lookAt(state.camX, 0, 0)
      }
      renderer.render(scene, camera)

      // Map the DOM editor onto the page as rendered this frame.
      const editorEl = editorRef.current
      if (state.editing && page && editorEl) {
        camera.updateMatrixWorld()
        const toScreen = (u: number, v: number): Point2 => {
          projected.copy(page.at(u, v)).project(camera)
          return {
            x: ((projected.x + 1) / 2) * state.viewW,
            y: ((1 - projected.y) / 2) * state.viewH,
          }
        }
        const quad = [
          toScreen(0, 0),
          toScreen(1, 0),
          toScreen(1, 1),
          toScreen(0, 1),
        ] as const
        state.editQuad = [...quad]
        editorEl.style.transform = quadToMatrix3d(
          PAGE_WIDTH_PX,
          PAGE_HEIGHT_PX,
          quad,
        )
        // Average on-screen scale through the middle of the page, for drag maths.
        const mid = (a: Point2, c: Point2) => ({
          x: (a.x + c.x) / 2,
          y: (a.y + c.y) / 2,
        })
        const dist = (a: Point2, c: Point2) => Math.hypot(a.x - c.x, a.y - c.y)
        const scale =
          (dist(mid(quad[0], quad[3]), mid(quad[1], quad[2])) / PAGE_WIDTH_PX +
            dist(mid(quad[0], quad[1]), mid(quad[3], quad[2])) /
              PAGE_HEIGHT_PX) /
          2
        if (
          state.editBlend === 1 &&
          Math.abs(scale - state.editScale) > 0.002
        ) {
          state.editScale = scale
          setEditScale(scale)
        }
      }

      const ready =
        state.editing && state.editBlend === 1 && state.flip === state.target
      if (ready !== state.overlayReady) {
        state.overlayReady = ready
        setOverlayReady(ready)
      }
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      reducedMotionQuery.removeEventListener("change", onReducedMotion)
      sceneRef.current = null
      leaves.forEach(({ material }) => material.dispose())
      leafGeometry.dispose()
      faceTextures.forEach((t) => t.dispose())
      shadowTexture.dispose()
      shadowMaterial.dispose()
      shadowGeometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [faces])

  // ── Paint page textures ────────────────────────────────────────────────────
  useEffect(() => {
    const handle = sceneRef.current
    if (!handle) return
    const resources = { images, fontFamily }
    const paint = (faceIndex: number) => {
      const face = faces[faceIndex]
      const canvas = handle.faceCanvases[faceIndex]
      const texture = handle.faceTextures[faceIndex]
      if (!face || !canvas || !texture) return
      paintFace(canvas, face, content, resources)
      texture.needsUpdate = true
    }
    paintFaceRef.current = paint
    gifFacesRef.current = faces.flatMap((face, i) =>
      faceHasGif(face, content) ? [i] : [],
    )
    // Only repaint (and re-upload) faces whose content actually changed.
    let painted = false
    faces.forEach((face, i) => {
      const signature = `${fontsVersion}|${faceSignature(face, content, resources)}`
      if (paintedRef.current.get(i) === signature) return
      paintedRef.current.set(i, signature)
      paint(i)
      painted = true
    })
    if (painted) live.current.dirty = true
  }, [faces, content, images, fontFamily, fontsVersion])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const currentSide: Side =
    flipTarget <= 0 ? "right" : flipTarget >= leafCount ? "left" : focus

  const visiblePage =
    editPage ??
    Math.min(
      totalPages - 1,
      flipTarget <= 0
        ? 0
        : narrow && currentSide === "right"
          ? flipTarget * 2
          : flipTarget * 2 - 1,
    )
  const onPageChangeRef = useRef(onPageChange)
  useEffect(() => {
    onPageChangeRef.current = onPageChange
  }, [onPageChange])
  useEffect(() => {
    onPageChangeRef.current?.(visiblePage)
  }, [visiblePage])
  const canGoPrev = flipTarget > 0
  const canGoNext = flipTarget < leafCount

  const goTo = useCallback(
    (flip: number, side: Side) => {
      const clamped = Math.min(leafCount, Math.max(0, flip))
      live.current.target = clamped
      live.current.focus = side
      setFlipTarget(clamped)
      setFocus(side)
    },
    [leafCount],
  )

  /** The click that opened the editor, replayed on the editor once it is in place. */
  const pendingClickRef = useRef<PagePoint | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  /** Open a card page for editing (null closes the editor). */
  const editPageAt = useCallback(
    (page: number | null) => {
      if (page === null) {
        // Inline fields save on blur; blur first so closing never drops an unsaved edit.
        const active = document.activeElement
        if (
          active instanceof HTMLElement &&
          editorRef.current?.contains(active)
        ) {
          active.blur()
        }
        pendingClickRef.current = null
        setEditPage(null)
        return
      }
      const clamped = Math.min(totalPages - 1, Math.max(0, page))
      setEditPage(clamped)
      goTo(spreadForPage(clamped), clamped % 2 === 1 ? "left" : "right")
    },
    [totalPages, goTo],
  )

  // There is no "done" step: editing lasts while focus stays in the editor (or its pager and
  // formatting panels) and ends when the user clicks or tabs away from it.
  const editPageAtRef = useRef(editPageAt)
  useEffect(() => {
    editPageAtRef.current = editPageAt
  }, [editPageAt])
  const isEditing = editPage !== null
  useEffect(() => {
    if (!isEditing) return
    let pointerDown = false
    let onNote = false
    let timer = 0
    const inEditor = (node: EventTarget | null) =>
      node instanceof Node && Boolean(editorRef.current?.contains(node))
    /** The card's own controls (pager) and panels or popups that belong to the editor. */
    const inChrome = (node: EventTarget | null) =>
      node instanceof Element &&
      !inEditor(node) &&
      (node !== containerRef.current && Boolean(rootRef.current?.contains(node))
        ? true
        : node.closest(EDITOR_CHROME_SELECTOR) !== null)
    // Wait a tick: clicking from one field to another blurs the first before focusing the next.
    const check = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (pointerDown || onNote || pendingClickRef.current) return
        const active = document.activeElement
        if (inEditor(active) || inChrome(active)) return
        editPageAtRef.current(null)
      }, 0)
    }
    let downInChrome = false
    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true
      downInChrome = inChrome(e.target)
      // Dragging or resizing a note keeps it selected even though nothing is focused.
      onNote =
        inEditor(e.target) &&
        e.target instanceof Element &&
        e.target.closest("[data-draggable-note]") !== null
    }
    const onPointerUp = () => {
      pointerDown = false
      // Pager clicks move between pages while editing (a button may disable and drop focus).
      if (!downInChrome) check()
    }
    const onFocusOut = (e: FocusEvent) => {
      if (pointerDown || inChrome(e.target)) return
      check()
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointerup", onPointerUp, true)
    document.addEventListener("pointercancel", onPointerUp, true)
    document.addEventListener("focusout", onFocusOut, true)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointerup", onPointerUp, true)
      document.removeEventListener("pointercancel", onPointerUp, true)
      document.removeEventListener("focusout", onFocusOut, true)
    }
  }, [isEditing])

  // Replay the click that opened a page on the editor, so one click both brings the page in
  // and starts editing whatever was under the pointer (a headline, a note, a spot to place one).
  useEffect(() => {
    if (!overlayReady) return
    const pending = pendingClickRef.current
    pendingClickRef.current = null
    const quad = live.current.editQuad
    const editor = editorRef.current
    const container = containerRef.current
    if (!pending || !quad || !editor || !container) return
    const rect = container.getBoundingClientRect()
    const point = mapBoxPoint(
      PAGE_WIDTH_PX,
      PAGE_HEIGHT_PX,
      quad,
      pending.u * PAGE_WIDTH_PX,
      pending.v * PAGE_HEIGHT_PX,
    )
    const clientX = rect.left + point.x
    const clientY = rect.top + point.y
    const target = document.elementFromPoint(clientX, clientY)
    if (!target || !editor.contains(target)) return
    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
      }),
    )
  }, [overlayReady])

  // Keep the edited page in range if pages are removed; open a newly added page.
  const pendingAddedPageRef = useRef<number | null>(null)
  useEffect(() => {
    const pending = pendingAddedPageRef.current
    if (pending !== null) {
      if (totalPages > pending) {
        pendingAddedPageRef.current = null
        queueMicrotask(() => editPageAt(pending))
      }
      return
    }
    if (editPage !== null && editPage >= totalPages) {
      queueMicrotask(() => editPageAt(totalPages - 1))
    }
  }, [totalPages, editPage, editPageAt])

  const addPage = async () => {
    if (!onAddPage) return
    pendingAddedPageRef.current = totalPages
    try {
      await onAddPage()
    } catch {
      pendingAddedPageRef.current = null
    }
  }

  /** The card page under a click, or null for the back cover and padding pages. */
  const pageAtClick = (xFraction: number): number | null => {
    let page: number
    // A closed card opens on click; the cover has its own "Edit cover" button.
    if (flipTarget <= 0) {
      if (!coverOnly) return null
      page = 0
    } else if (flipTarget >= leafCount) return null
    else if (narrow) page = visiblePage
    else page = xFraction < 0.5 ? flipTarget * 2 - 1 : flipTarget * 2
    return page < totalPages ? page : null
  }

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!narrow) {
        goTo(flipTarget + dir, dir === 1 ? "left" : "right")
        return
      }
      // Narrow screens show one page: step left → right within a spread, then turn.
      if (dir === 1) {
        if (currentSide === "left" && flipTarget < leafCount) {
          goTo(flipTarget, "right")
        } else if (flipTarget < leafCount) {
          goTo(flipTarget + 1, "left")
        }
      } else if (currentSide === "right" && flipTarget > 0) {
        goTo(flipTarget, "left")
      } else if (flipTarget > 0) {
        goTo(flipTarget - 1, "right")
      }
    },
    [narrow, flipTarget, leafCount, currentSide, goTo],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    live.current.pointer = {
      id: e.pointerId,
      startX: e.clientX,
      startFlip: live.current.flip,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      dragging: false,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = live.current
    const rect = e.currentTarget.getBoundingClientRect()
    if (state.editing) return
    if (e.pointerType === "mouse") {
      state.tiltTarget = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
      }
    }
    const pointer = state.pointer
    if (!pointer || pointer.id !== e.pointerId) return
    const dx = e.clientX - pointer.startX
    if (!pointer.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
      pointer.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const pagePx = (rect.width / (state.fitW * FRAME_MARGIN_W)) * PAGE_W
    const pxPerLeaf = pagePx * DRAG_PAGES_PER_TURN
    state.flip = Math.min(
      leafCount,
      Math.max(0, pointer.startFlip - dx / pxPerLeaf),
    )
    const dt = Math.max(1, e.timeStamp - pointer.lastT) / 1000
    const instant = -(e.clientX - pointer.lastX) / pxPerLeaf / dt
    pointer.velocity = pointer.velocity * 0.6 + instant * 0.4
    pointer.lastX = e.clientX
    pointer.lastT = e.timeStamp
    state.dirty = true
  }

  const endPointer = (
    e: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const state = live.current
    const pointer = state.pointer
    if (!pointer || pointer.id !== e.pointerId) return
    state.pointer = null
    if (pointer.dragging) {
      const target = settleFlipTarget(state.flip, pointer.velocity, leafCount)
      const start = Math.round(pointer.startFlip)
      goTo(
        target,
        target > start ? "left" : target < start ? "right" : currentSide,
      )
      return
    }
    if (cancelled) return
    // Clicking around the page being edited closes the editor.
    if (editPage !== null) {
      editPageAt(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const xFraction = (e.clientX - rect.left) / rect.width
    const page = editable ? pageAtClick(xFraction) : null
    if (page !== null) {
      const side: Side =
        flipTarget <= 0
          ? "right"
          : narrow
            ? currentSide
            : xFraction < 0.5
              ? "left"
              : "right"
      pendingClickRef.current =
        sceneRef.current?.pickPage(e.clientX, e.clientY, side) ?? null
      editPageAt(page)
    } else step(xFraction < 0.5 ? -1 : 1)
  }

  const canEditPrev = editPage !== null && editPage > 0
  const canEditNext =
    editPage !== null && (editPage < totalPages - 1 || Boolean(onAddPage))
  const prev = () => {
    if (editPage !== null) editPageAt(editPage - 1)
    else step(-1)
  }
  const next = () => {
    if (editPage === null) step(1)
    else if (editPage < totalPages - 1) editPageAt(editPage + 1)
    else void addPage()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      next()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      prev()
    } else if (e.key === "Escape" && editPage !== null) {
      e.preventDefault()
      editPageAt(null)
    }
  }

  if (webglFailed) return <>{fallback}</>

  return (
    <div
      ref={rootRef}
      className={cn("flex w-full flex-col items-center gap-6", className)}
    >
      <div className="relative w-full">
        <div
          ref={containerRef}
          role="group"
          aria-roledescription="3D card"
          aria-label={
            editable
              ? `Card for ${recipientName}. Click any text on a page to edit it; use the arrow keys to move between pages and Escape to finish.`
              : `Card for ${recipientName}. Use the arrow keys or drag to turn pages.`
          }
          tabIndex={0}
          className={cn(
            "relative w-full cursor-grab touch-pan-y rounded-2xl outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
            coverOnly
              ? "aspect-4/5"
              : editable
                ? "aspect-4/5 sm:aspect-auto sm:h-[560px]"
                : "aspect-4/5 sm:aspect-4/3",
            editable && editPage === null && "cursor-pointer",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, false)}
          onPointerCancel={(e) => endPointer(e, true)}
          onPointerLeave={() => {
            live.current.tiltTarget = { x: 0, y: 0 }
          }}
          onKeyDown={onKeyDown}
        >
          <span ref={fontProbeRef} className="hidden" aria-hidden />
          <div
            ref={imageHostRef}
            className="pointer-events-none absolute top-0 left-0 h-px w-px overflow-hidden opacity-0"
            aria-hidden
          />
        </div>
        {renderPageEditor && editPage !== null ? (
          // The editor is laid out at the page's natural size and mapped onto the 3D page
          // with a perspective transform the render loop updates.
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl">
            <div
              ref={editorRef}
              className={cn(
                "absolute top-0 left-0 origin-top-left transition-opacity duration-200 motion-reduce:transition-none",
                overlayReady ? "pointer-events-auto opacity-100" : "opacity-0",
              )}
              style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
              onKeyDown={(e) => {
                if (e.key === "Escape") editPageAt(null)
              }}
            >
              <CardCanvasScaleContext.Provider value={editScale}>
                <PageEditorHost
                  render={renderPageEditor}
                  page={editPage}
                  width={PAGE_WIDTH_PX}
                  height={PAGE_HEIGHT_PX}
                  onPageChange={editPageAt}
                />
              </CardCanvasScaleContext.Provider>
            </div>
          </div>
        ) : null}
        {editable && editPage === null ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {flipTarget <= 0 && !coverOnly ? (
              <>
                <span>Click the card to open it</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="pointer-events-auto h-7 rounded-full px-2.5 text-xs"
                  onClick={() => editPageAt(0)}
                >
                  <Pencil />
                  Edit cover
                </Button>
              </>
            ) : (
              <span>Click any text to edit it</span>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={prev}
          disabled={editPage !== null ? !canEditPrev : !canGoPrev}
          aria-label="Previous page"
        >
          <ArrowLeft />
        </Button>
        <div className="flex items-center gap-2">
          {Array.from({ length: leafCount + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (editPage !== null) editPageAt(null)
                goTo(i, i === 0 ? "right" : "left")
              }}
              className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${
                i === flipTarget
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={spreadLabel(i, leafCount)}
              aria-current={i === flipTarget ? "true" : undefined}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={next}
          disabled={editPage !== null ? !canEditNext : !canGoNext}
          aria-label={
            editPage !== null && editPage >= totalPages - 1 && onAddPage
              ? "Add a page"
              : "Next page"
          }
        >
          {editPage !== null && editPage >= totalPages - 1 && onAddPage ? (
            <Plus />
          ) : (
            <ArrowRight />
          )}
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {spreadLabel(flipTarget, leafCount)}
      </p>
      <CardTextAlternative
        headline={headline}
        recipientName={recipientName}
        message={message}
        contributions={contributions}
      />
    </div>
  )
}

function PageEditorHost({
  render,
  ...args
}: PageEditorArgs & { render: (args: PageEditorArgs) => ReactNode }) {
  return <>{render(args)}</>
}

/**
 * Where the edited page sits in world space: the leaf is flat while editing, hinged at the
 * spine at angle `progress · π`. `at(u, v)` maps a point of the editor (fractions from its
 * top-left) onto the visible face; a right-hand page shows a leaf's front, a left-hand page
 * its back. Mirrors the vertex shader in `page-shader.ts`.
 */
function editedPageFrame(progress: number, lift: number, side: Side) {
  const a = progress * Math.PI
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const sign = side === "right" ? 1 : -1
  // Just proud of the face so the editor never dips behind the page.
  const off = sign * (LEAF_THICKNESS / 2 + 0.0005)
  const at = (u: number, v: number) => {
    const s = (side === "right" ? u : 1 - u) * PAGE_W
    return new Vector3(
      cos * s - sin * off,
      PAGE_H / 2 - v * PAGE_H,
      sin * s + lift + cos * off,
    )
  }
  return {
    at,
    center: at(0.5, 0.5),
    normal: { x: -sin * sign, z: cos * sign },
  }
}

function spreadLabel(spread: number, leafCount: number): string {
  if (spread <= 0) return "Front cover"
  if (spread >= leafCount) return "Back cover"
  return `Inside, spread ${spread}`
}

/** Screen-reader copy of what the WebGL canvas shows. */
function CardTextAlternative({
  headline,
  recipientName,
  message,
  contributions,
}: {
  headline: string
  recipientName: string
  message: string
  contributions: Contribution[]
}) {
  const notes = contributions.filter((c) => c.message?.trim() || c.giphy_url)
  return (
    <div className="sr-only">
      <h2>{headline}</h2>
      <p>For {recipientName}</p>
      {message.trim() ? <p>{message}</p> : null}
      {notes.length > 0 ? (
        <ul>
          {notes.map((c) => (
            <li key={c.id}>
              {c.message}
              {c.giphy_url ? " (with a GIF)" : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Loads images for canvas painting. CORS-enabled so WebGL can upload them; each element is
 * parked in a hidden host so animated GIFs keep advancing frames.
 */
function useLoadedImages(
  urls: string[],
  hostRef: RefObject<HTMLDivElement | null>,
): ReadonlyMap<string, HTMLImageElement> {
  const [images, setImages] = useState<ReadonlyMap<string, HTMLImageElement>>(
    () => new Map(),
  )
  const key = urls.join("\n")

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const created: HTMLImageElement[] = []
    for (const url of key.split("\n")) {
      const img = new Image()
      img.decoding = "async"
      if (!url.startsWith("data:")) img.crossOrigin = "anonymous"
      img.alt = ""
      img.onload = () => {
        if (cancelled) return
        setImages((prev) => new Map(prev).set(url, img))
      }
      img.src = url
      hostRef.current?.appendChild(img)
      created.push(img)
    }
    return () => {
      cancelled = true
      created.forEach((img) => img.remove())
    }
  }, [key, hostRef])

  return images
}

function createShadowTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const inset = size * 0.08
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)"
    ctx.shadowBlur = size * 0.05
    // Draw the rect off-canvas so only its blurred shadow lands on the texture.
    ctx.shadowOffsetX = size * 2
    ctx.fillStyle = "#000"
    ctx.fillRect(inset - size * 2, inset, size - inset * 2, size - inset * 2)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
