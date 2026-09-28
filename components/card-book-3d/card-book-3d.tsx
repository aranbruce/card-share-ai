"use client"

import { Button } from "@/components/ui/button"
import {
  CardCanvasPointContext,
  CardCanvasScaleContext,
  type CardCanvasPointMapper,
} from "@/components/card-3d/canvas-scale-context"
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
import {
  mapBoxPoint,
  quadToMatrix3d,
  unmapBoxPoint,
  type Point2,
} from "@/lib/quad-transform"
import { flushSync } from "react-dom"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, Plus } from "lucide-react"
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
import { ClosedCardCover } from "./closed-card-cover"
import { cardBookFrameClass } from "./frame"
import {
  BROWSE_PITCH,
  CAMERA_FOV,
  CLOSED_PITCH,
  CLOSED_YAW,
  FRAME_MARGIN_H,
  FRAME_MARGIN_W,
  PAGE_H,
  PAGE_W,
} from "@/lib/card-book-pose"
import {
  createPageMaterial,
  LEAF_THICKNESS,
  type PageMaterial,
} from "./page-shader"

/** Gap between stacked leaves so they never z-fight. */
const LEAF_GAP = LEAF_THICKNESS + 0.0015
/** Gloss on the printed covers; inside pages are matte card stock. */
const COVER_GLOSS = 0.35
const PAGE_GLOSS = 0.03
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
/** Editing camera speeds (per second): pulling back to change page, and closing in. */
const EDIT_PULL_BACK_RATE = 6
const EDIT_CLOSE_IN_RATE = 8
/**
 * How far the editing camera has closed in (0 to 1) before the editor shows. It tracks the
 * page while the camera finishes moving, so it can appear before the camera settles.
 */
const EDIT_OVERLAY_AT = 0.75
/** Canvas bleed past the container, as a share of its width and height. */
const CANVAS_BLEED_X = 0.75
const CANVAS_BLEED_Y = 0.12
/** Room around the edited page, as a multiple of its size. */
const EDIT_FRAME_W = 1.2
const EDIT_FRAME_H = 1.16
/**
 * Focus in these counts as still editing: side panels that format the selected note (marked
 * by the host) and popups the editor portals out of the card.
 */
const EDITOR_CHROME_SELECTOR =
  '[data-card-editor-chrome],[role="dialog"],[data-regenerate-area],[data-radix-popper-content-wrapper]'
/** How long after "Add a page" resolves to wait for the new page before giving up. */
const ADD_PAGE_WAIT_MS = 4000
/** The cover's title and "For …" line sit below this fraction of its height. */
const COVER_TITLE_ZONE = 0.62
/** Peak darkening a lifted page casts on the page beneath it. */
const TURN_SHADOW = 0.38
const DRAG_THRESHOLD_PX = 8
/** Horizontal drag distance (in page widths) for one full turn. */
const DRAG_PAGES_PER_TURN = 1.6
/** GIF frames are re-uploaded as whole page textures, so keep the rate modest. */
const GIF_REPAINT_MS = 150
/** Quiet time after the last viewport change before the keyboard counts as settled. */
const KEYBOARD_SETTLE_MS = 250
/** Longest to wait for a keyboard to open after a note gets focus before revealing it. */
const KEYBOARD_WAIT_MS = 700
/** How long the browser gets to bring the caret into view before the page is moved. */
const CARET_REVEAL_WAIT_MS = 200
/** Room kept around the note when bringing it into view. */
const REVEAL_MARGIN_PX = 16
/** Longest a touch tap waits for its click before it is handled without one. */
const TAP_CLICK_WAIT_MS = 400
/** Longest the card waits for its cover image and fonts before showing anyway. */
const REVEAL_TIMEOUT_MS = 2500
/** Cross-fade from the placeholder cover to the 3D card. */
const REVEAL_FADE_MS = 250
/** How long the card shows closed before opening to a starting page inside. */
const REVEAL_OPEN_DELAY_MS = 350

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

type BookFaces = ReturnType<typeof buildBookFaces>

type SceneHandle = {
  faceCanvases: HTMLCanvasElement[]
  faceTextures: CanvasTexture[]
  /** Rebuilds the leaves for a new set of faces, keeping the renderer and scene. */
  setFaces: (faces: BookFaces) => void
  /** Where a screen point lands on the visible page on `side`, if it does. */
  pickPage: (clientX: number, clientY: number, side: Side) => PagePoint | null
}

/** Mutable per-frame state the render loop reads without re-rendering React. */
type LiveState = {
  /** The canvas is showing: until then it stays closed on the cover behind the placeholder. */
  revealed: boolean
  /** Reveal once the next frame has rendered (textures are ready). */
  revealNext: boolean
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
  /**
   * The page the editing camera is on. It only moves to a newly chosen page once the camera
   * has pulled back, so switching pages eases out and back in rather than jumping.
   */
  shownEdit: { side: Side; leaf: number } | null
  /** How far the canvas extends past the container on each side (CSS px), so pages that
   * swing or sit outside the frame are not cut off. */
  bleed: { l: number; t: number; r: number; b: number }
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
  // A page the host asked for before this mounted (the card loads on demand) still counts:
  // it opens there, and on editing surfaces opens it for editing.
  const [editPage, setEditPage] = useState<number | null>(() => {
    if (!editable) return null
    if (autoEditPage !== undefined) return autoEditPage
    return navigateToPage !== undefined && !coverOnly ? navigateToPage : null
  })
  const [overlayReady, setOverlayReady] = useState(false)
  const [editScale, setEditScale] = useState(1)
  /** The editor element, mapped onto the 3D page every frame by the render loop. */
  const editorRef = useRef<HTMLDivElement>(null)
  /** The editor is briefly laid out flat (untransformed) to replay a click inside a tap. */
  const editorFlatRef = useRef(false)
  /** A touch tap waiting for its click event (see endPointer). */
  const pendingTapRef = useRef<{
    x: number
    y: number
    timer: number
  } | null>(null)
  const startPage =
    editPage ?? (coverOnly ? 0 : (navigateToPage ?? initialPage))
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
  /** The 3D canvas is showing (see Reveal below); the placeholder cover goes once it has. */
  const [revealed, setRevealed] = useState(false)
  const [placeholderGone, setPlaceholderGone] = useState(false)
  /** The spread to open to once revealed (the latest `flipTarget`). */
  const flipTargetRef = useRef(flipTarget)

  // It starts closed on the cover, where the loading placeholder shows it, and opens to the
  // starting page once visible.
  const live = useRef<LiveState>({
    revealed: false,
    revealNext: false,
    flip: 0,
    target: 0,
    focus: initialFocus,
    narrow: false,
    reducedMotion: false,
    camX: PAGE_W / 2,
    fitW: PAGE_W,
    tilt: { x: 0, y: 0 },
    tiltTarget: { x: 0, y: 0 },
    dirty: true,
    editing: editPage !== null,
    editBlend: 0,
    viewW: 0,
    viewH: 0,
    overlayReady: false,
    editScale: 1,
    editQuad: null,
    shownEdit: null,
    bleed: { l: 0, t: 0, r: 0, b: 0 },
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
  const { images, failed: failedImages } = useLoadedImages(
    imageUrls,
    imageHostRef,
  )

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
    flipTargetRef.current = flipTarget
    live.current.focus = focus
    // Until the card shows, it waits closed; it turns to the target once revealed.
    if (live.current.revealed) live.current.target = flipTarget
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
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.pointerEvents = "none"
    // Hidden behind the placeholder cover until its textures are ready (see reveal below).
    renderer.domElement.style.opacity = "0"
    container.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50)
    const state = live.current
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
    // One canvas and texture per face; kept across page-count changes (see setFaces).
    const faceCanvases: HTMLCanvasElement[] = []
    const faceTextures: CanvasTexture[] = []
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
    let leafTotal = 0

    const shadowTexture = createShadowTexture()
    const shadowMaterial = new MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    })
    const shadowGeometry = new PlaneGeometry(1, 1)
    const shadow = new Mesh(shadowGeometry, shadowMaterial)
    shadow.renderOrder = -1
    scene.add(shadow)

    // Adding or removing pages keeps the renderer (and its GL context), camera and loop, and
    // reuses page textures; leaves are only added or removed at the end. The paint effect then
    // repaints just the faces whose content changed.
    const createLeaf = (i: number): Leaf => {
      const material = createPageMaterial(
        faceTextures[i * 2],
        faceTextures[i * 2 + 1],
        PAGE_W,
        { front: i === 0 ? COVER_GLOSS : PAGE_GLOSS, back: PAGE_GLOSS },
      )
      const mesh = new Mesh(leafGeometry, material)
      // Vertices move in the shader; the static bounds would cull turning pages.
      mesh.frustumCulled = false
      scene.add(mesh)
      return { mesh, material }
    }
    const setFaces = (next: BookFaces) => {
      while (faceCanvases.length < next.length) {
        const canvas = document.createElement("canvas")
        canvas.width = PAGE_WIDTH_PX * PAGE_TEXTURE_SCALE
        canvas.height = PAGE_HEIGHT_PX * PAGE_TEXTURE_SCALE
        const texture = new CanvasTexture(canvas)
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = anisotropy
        faceCanvases.push(canvas)
        faceTextures.push(texture)
      }
      while (faceCanvases.length > next.length) {
        faceCanvases.pop()
        faceTextures.pop()?.dispose()
        paintedRef.current.delete(faceCanvases.length)
      }

      leafTotal = leafCountForFaces(next)
      while (leaves.length > leafTotal) {
        const leaf = leaves.pop()
        if (leaf) {
          scene.remove(leaf.mesh)
          leaf.material.dispose()
        }
      }
      while (leaves.length < leafTotal) leaves.push(createLeaf(leaves.length))
      // Only the last leaf's back is the (glossy) back cover.
      leaves.forEach(({ material }, i) => {
        material.uniforms.uGlossBack.value =
          i === leafTotal - 1 ? COVER_GLOSS : PAGE_GLOSS
      })
      shadow.position.z = -LEAF_GAP * (leafTotal + 2)
      state.flip = Math.min(state.flip, leafTotal)
      state.target = Math.min(state.target, leafTotal)
      state.dirty = true
    }

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const { width, height } = rect
      if (width <= 0 || height <= 0) return
      // Draw past the container (within the viewport, so the page never scrolls sideways)
      // while keeping the same framing: the camera still frames the container.
      const viewportW = document.documentElement.clientWidth
      const bleed = {
        l: Math.max(0, Math.min(rect.left, width * CANVAS_BLEED_X)),
        r: Math.max(
          0,
          Math.min(viewportW - rect.right, width * CANVAS_BLEED_X),
        ),
        t: height * CANVAS_BLEED_Y,
        b: height * CANVAS_BLEED_Y,
      }
      const fullW = width + bleed.l + bleed.r
      const fullH = height + bleed.t + bleed.b
      renderer.setSize(fullW, fullH, false)
      const style = renderer.domElement.style
      style.left = `${-bleed.l}px`
      style.top = `${-bleed.t}px`
      style.width = `${fullW}px`
      style.height = `${fullH}px`
      // Fade out towards the canvas edges so pages running past them soften away rather
      // than stopping at a hard line.
      const fade = (px: number) => Math.round(px * 0.85)
      const mask = [
        `linear-gradient(to right, transparent, #000 ${fade(bleed.l)}px, #000 calc(100% - ${fade(bleed.r)}px), transparent)`,
        `linear-gradient(to bottom, transparent, #000 ${fade(bleed.t)}px, #000 calc(100% - ${fade(bleed.b)}px), transparent)`,
      ].join(", ")
      style.maskImage = mask
      style.maskComposite = "intersect"
      style.setProperty("-webkit-mask-image", mask)
      style.setProperty("-webkit-mask-composite", "source-in")
      camera.aspect = width / height
      camera.setViewOffset(width, height, -bleed.l, -bleed.t, fullW, fullH)
      camera.updateProjectionMatrix()
      setNarrow(width / height < 1)
      state.viewW = width
      state.viewH = height
      state.bleed = bleed
      state.dirty = true
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    // The bleed depends on where the container sits, which can change without it resizing.
    window.addEventListener("resize", resize)

    const projected = new Vector3()
    const raycaster = new Raycaster()
    // Intersects the pointer ray with the page as the shader bends it (curl included), so a
    // click lands on the same text in the editor that it hit on the 3D page.
    const pickPage = (
      clientX: number,
      clientY: number,
      side: Side,
    ): PagePoint | null => {
      const rect = container.getBoundingClientRect()
      const leaf = side === "right" ? state.target : state.target - 1
      const u = leaves[leaf]?.material.uniforms
      if (!u || rect.width <= 0 || rect.height <= 0) return null
      const { bleed } = state
      raycaster.setFromCamera(
        new Vector2(
          ((clientX - rect.left + bleed.l) / (rect.width + bleed.l + bleed.r)) *
            2 -
            1,
          -(
            (clientY - rect.top + bleed.t) /
            (rect.height + bleed.t + bleed.b)
          ) *
            2 +
            1,
        ),
        camera,
      )
      const { origin: o, direction: d } = raycaster.ray
      const surface = pageSurface(
        u.uProgress.value,
        u.uCurl.value,
        u.uLift.value,
        side,
      )
      // The page is a vertical ruled surface: find where its curve crosses the ray's
      // vertical plane, then read the height off the ray.
      const across = (s: number) => {
        const p = surface(s)
        return (p.x - o.x) * -d.z + (p.z - o.z) * d.x
      }
      const steps = 48
      let hit: number | null = null
      let prev = across(0)
      for (let i = 1; i <= steps && hit === null; i++) {
        const s1 = (i / steps) * PAGE_W
        const next = across(s1)
        if (prev === 0 || Math.sign(prev) !== Math.sign(next)) {
          let lo = s1 - PAGE_W / steps
          let hi = s1
          for (let j = 0; j < 24; j++) {
            const mid = (lo + hi) / 2
            if (Math.sign(across(mid)) === Math.sign(across(lo))) lo = mid
            else hi = mid
          }
          hit = (lo + hi) / 2
        }
        prev = next
      }
      if (hit === null) return null
      const p = surface(hit)
      const t =
        Math.abs(d.x) > Math.abs(d.z) ? (p.x - o.x) / d.x : (p.z - o.z) / d.z
      if (t < 0) return null
      const y = o.y + d.y * t
      const point = {
        u: side === "right" ? hit / PAGE_W : 1 - hit / PAGE_W,
        v: (PAGE_H / 2 - y) / PAGE_H,
      }
      return point.v >= 0 && point.v <= 1 ? point : null
    }
    sceneRef.current = {
      faceCanvases,
      faceTextures,
      pickPage,
      setFaces,
    }
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
      // While editing, a turn waits until the camera has pulled back from the page.
      const holdTurn = state.editing && state.editBlend > 0.35
      if (!state.pointer?.dragging && holdTurn) {
        if (state.target !== state.flip) moving = true
      } else if (!state.pointer?.dragging) {
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
      // The page chosen for editing: the focused side of the target spread.
      const editSide: Side =
        state.target <= 0
          ? "right"
          : state.target >= leafTotal
            ? "left"
            : state.focus
      const editLeaf = editSide === "right" ? state.target : state.target - 1
      // The camera stays on the page it shows until it has pulled back, then moves over.
      if (!state.editing || !state.shownEdit || state.editBlend < 0.02) {
        state.shownEdit = { side: editSide, leaf: editLeaf }
      }
      const shown = state.shownEdit
      const onChosenPage = shown.side === editSide && shown.leaf === editLeaf
      // Ease between browsing and the editing camera: pull back to move to another page
      // (and while a page turns), then close in on it.
      const editGoal =
        state.revealed &&
        state.editing &&
        onChosenPage &&
        Math.abs(state.target - state.flip) < 0.02
          ? 1
          : 0
      if (Math.abs(editGoal - state.editBlend) > 0.002) {
        const rate = state.reducedMotion
          ? 30
          : state.editing && editGoal === 0
            ? EDIT_PULL_BACK_RATE
            : EDIT_CLOSE_IN_RATE
        state.editBlend +=
          (editGoal - state.editBlend) * (1 - Math.exp(-dt * rate))
        moving = true
      } else if (state.editBlend !== editGoal) {
        state.editBlend = editGoal
        moving = true
      }

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
          i === shown.leaf
            ? // Flat well before the editor shows, so the editor lies exactly on it.
              PAGE_CURL_RADIANS *
              Math.max(0, 1 - state.editBlend / (EDIT_OVERLAY_AT * 0.75))
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
        if (state.editing !== state.overlayReady) state.dirty = true
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
      const pitch = BROWSE_PITCH + CLOSED_PITCH * closed - state.tilt.y * 0.12
      const browseX = state.camX + distance * Math.sin(yaw) * Math.cos(pitch)
      const browseY = distance * Math.sin(pitch)
      const browseZ = distance * Math.cos(yaw) * Math.cos(pitch)

      // Editing camera: close in on the edited page, seen a little from the side and above.
      const edited = leaves[shown.leaf]?.material.uniforms
      const page = edited
        ? editedPageFrame(
            edited.uProgress.value,
            edited.uLift.value,
            shown.side,
          )
        : null
      const b = state.editBlend * state.editBlend * (3 - 2 * state.editBlend)
      const mix = (a: number, c: number) => a + (c - a) * b
      if (page) {
        const editDistance = Math.max(
          (PAGE_H * EDIT_FRAME_H) / 2 / Math.tan(halfFov),
          (PAGE_W * EDIT_FRAME_W) / 2 / (Math.tan(halfFov) * camera.aspect),
        )
        // Swing the page normal towards the spine, then raise it.
        const yaw = shown.side === "right" ? -EDIT_YAW : EDIT_YAW
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
      if (state.revealNext) {
        state.revealNext = false
        if (!state.revealed) {
          state.revealed = true
          setRevealed(true)
          const fade = state.reducedMotion ? 0 : REVEAL_FADE_MS
          const canvas = renderer.domElement
          canvas.style.transition = fade ? `opacity ${fade}ms ease-out` : ""
          canvas.style.opacity = "1"
          window.setTimeout(() => setPlaceholderGone(true), fade + 50)
          // A beat on the closed card before it opens, unless motion is reduced.
          const open = () => {
            state.target = flipTargetRef.current
            state.dirty = true
          }
          if (state.reducedMotion || flipTargetRef.current === 0) open()
          else window.setTimeout(open, REVEAL_OPEN_DELAY_MS)
        }
      }

      // Map the DOM editor onto the page as rendered this frame.
      const editorEl = editorRef.current
      if (state.editing && page && editorEl) {
        camera.updateMatrixWorld()
        const toScreen = (u: number, v: number): Point2 => {
          projected.copy(page.at(u, v)).project(camera)
          const { bleed } = state
          return {
            x:
              ((projected.x + 1) / 2) * (state.viewW + bleed.l + bleed.r) -
              bleed.l,
            y:
              ((1 - projected.y) / 2) * (state.viewH + bleed.t + bleed.b) -
              bleed.t,
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
          state.editBlend >= EDIT_OVERLAY_AT &&
          Math.abs(scale - state.editScale) > 0.004
        ) {
          state.editScale = scale
          setEditScale(scale)
        }
      }

      const ready =
        state.editing &&
        onChosenPage &&
        state.editBlend >= EDIT_OVERLAY_AT &&
        state.flip === state.target
      if (ready !== state.overlayReady) {
        state.overlayReady = ready
        setOverlayReady(ready)
      }
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener("resize", resize)
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
  }, [])

  // Builds the leaves when the scene is created and whenever pages are added or removed.
  // Declared after the scene effect and before the paint effect, so it runs between them.
  useEffect(() => {
    sceneRef.current?.setFaces(faces)
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

  // ── Reveal ─────────────────────────────────────────────────────────────────
  // The canvas stays hidden behind the placeholder cover until the cover image and fonts
  // are painted, so it never shows a stand-in cover or fallback text; then it fades in
  // (identical in place and size) and turns to the starting page.
  const coverUrl = imageUrl || null
  const coverSettled =
    !coverUrl || images.has(coverUrl) || failedImages.has(coverUrl)
  const fontsSettled =
    fontsVersion > 0 || typeof document === "undefined" || !document.fonts
  useEffect(() => {
    if (revealed || !coverSettled || !fontsSettled) return
    // The paint effect above has painted with them; reveal once that frame renders.
    live.current.revealNext = true
    live.current.dirty = true
  }, [revealed, coverSettled, fontsSettled])
  // Never wait on a slow image or font for long.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      live.current.revealNext = true
      live.current.dirty = true
    }, REVEAL_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])
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

  /** Screen point to layout px within an editor element, through the page's perspective. */
  const toCanvasPoint = useCallback<CardCanvasPointMapper>(
    (element, clientX, clientY) => {
      // Laid out flat for a click replayed inside a tap (see openPageAt): one px is one px.
      if (editorFlatRef.current) {
        const box = element.getBoundingClientRect()
        return { x: clientX - box.left, y: clientY - box.top }
      }
      const editor = editorRef.current
      const container = containerRef.current
      const quad = live.current.editQuad
      if (!editor || !container || !quad) return null
      const rect = container.getBoundingClientRect()
      const point = unmapBoxPoint(
        PAGE_WIDTH_PX,
        PAGE_HEIGHT_PX,
        quad,
        clientX - rect.left,
        clientY - rect.top,
      )
      if (!point) return null
      let x = point.x
      let y = point.y
      let node: HTMLElement | null = element
      while (node && node !== editor) {
        x -= node.offsetLeft
        y -= node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      return node === editor ? { x, y } : null
    },
    [],
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
        const heldByNote = onNote
        // A note drag or resize only keeps editing open for that one interaction.
        if (!pointerDown) onNote = false
        if (pointerDown || heldByNote || pendingClickRef.current) return
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
    const x = pending.u * PAGE_WIDTH_PX
    const y = pending.v * PAGE_HEIGHT_PX
    const rect = container.getBoundingClientRect()
    const point = mapBoxPoint(PAGE_WIDTH_PX, PAGE_HEIGHT_PX, quad, x, y)
    const clientX = rect.left + point.x
    const clientY = rect.top + point.y
    // Text fields are found from the editor's own layout rather than by hit testing the
    // transformed editor, which browsers do not all get right straight after it moves.
    const target =
      nearestTextField(editor, x, y) ??
      document.elementFromPoint(clientX, clientY)
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

  // When a note gets focus on a phone, its keyboard slides up and the camera zooms in, which
  // can leave the note hidden until the first keystroke scrolls it into view (a jump). Once
  // both have settled, bring it into view straight away (see revealFocusedNote).
  useEffect(() => {
    if (!isEditing) return
    const editor = () => editorRef.current
    const viewport = window.visualViewport
    type VirtualKeyboard = EventTarget & { boundingRect?: DOMRect }
    const keyboard = (
      navigator as Navigator & { virtualKeyboard?: VirtualKeyboard }
    ).virtualKeyboard
    let settleTimer = 0
    let giveUpTimer = 0
    let waiting = false
    const reveal = () => {
      if (!waiting) return
      // Wait for the camera to arrive on the page, so the note is where it will stay.
      if (!live.current.overlayReady) {
        settleTimer = window.setTimeout(reveal, KEYBOARD_SETTLE_MS)
        return
      }
      waiting = false
      window.clearTimeout(giveUpTimer)
      revealFocusedNote(editor())
    }
    // The keyboard slides in over several viewport changes; act once they stop.
    const onViewportChange = () => {
      if (!waiting) return
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(reveal, KEYBOARD_SETTLE_MS)
    }
    const isNoteField = (node: EventTarget | null): node is HTMLElement =>
      node instanceof HTMLElement &&
      node.isContentEditable &&
      Boolean(editor()?.contains(node))
    const start = () => {
      waiting = true
      onViewportChange()
      // No on-screen keyboard (e.g. a hardware one) means no viewport change: go anyway.
      window.clearTimeout(giveUpTimer)
      giveUpTimer = window.setTimeout(reveal, KEYBOARD_WAIT_MS)
    }
    const onFocusIn = (e: FocusEvent) => {
      if (isNoteField(e.target)) start()
    }
    document.addEventListener("focusin", onFocusIn, true)
    viewport?.addEventListener("resize", onViewportChange)
    viewport?.addEventListener("scroll", onViewportChange)
    keyboard?.addEventListener("geometrychange", onViewportChange)
    // The note may already have focus: a tap focuses it as it opens the page.
    if (isNoteField(document.activeElement)) start()
    return () => {
      window.clearTimeout(settleTimer)
      window.clearTimeout(giveUpTimer)
      document.removeEventListener("focusin", onFocusIn, true)
      viewport?.removeEventListener("resize", onViewportChange)
      viewport?.removeEventListener("scroll", onViewportChange)
      keyboard?.removeEventListener("geometrychange", onViewportChange)
    }
  }, [isEditing])

  // Keep the edited page in range if pages are removed; open a newly added page.
  const pendingAddedPageRef = useRef<number | null>(null)
  useEffect(() => {
    const pending = pendingAddedPageRef.current
    if (pending !== null && totalPages > pending) {
      pendingAddedPageRef.current = null
      queueMicrotask(() => editPageAt(pending))
      return
    }
    if (editPage !== null && editPage >= totalPages) {
      queueMicrotask(() => editPageAt(totalPages - 1))
    }
  }, [totalPages, editPage, editPageAt])

  const addPage = async () => {
    if (!onAddPage) return
    const pending = totalPages
    pendingAddedPageRef.current = pending
    try {
      await onAddPage()
    } catch {
      // Handled below.
    }
    // Hosts may swallow a failed add; stop waiting if the page has not arrived shortly after.
    window.setTimeout(() => {
      if (pendingAddedPageRef.current === pending) {
        pendingAddedPageRef.current = null
      }
    }, ADD_PAGE_WAIT_MS)
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
    // A touch tap is handled on its click: phones send emulated mouse events after the tap
    // that would move focus off a field it opens, and only a tap or click lets them focus a
    // field and raise the keyboard. The click normally follows at once.
    if (e.pointerType !== "mouse") {
      const tap = { x: e.clientX, y: e.clientY, timer: 0 }
      window.clearTimeout(pendingTapRef.current?.timer)
      tap.timer = window.setTimeout(() => {
        if (pendingTapRef.current !== tap) return
        pendingTapRef.current = null
        handleTap(tap.x, tap.y)
      }, TAP_CLICK_WAIT_MS)
      pendingTapRef.current = tap
      return
    }
    handleTap(e.clientX, e.clientY)
  }

  const onContainerClick = () => {
    const tap = pendingTapRef.current
    if (!tap) return
    pendingTapRef.current = null
    window.clearTimeout(tap.timer)
    handleTap(tap.x, tap.y)
  }

  /** A click or tap on the 3D card (not a drag): opens, turns or edits a page. */
  const handleTap = (clientX: number, clientY: number) => {
    const container = containerRef.current
    if (!container) return
    // Clicking around the page being edited closes the editor.
    if (editPage !== null) {
      editPageAt(null)
      return
    }
    const rect = container.getBoundingClientRect()
    const xFraction = (clientX - rect.left) / rect.width
    // On a closed card, the title edits the cover; anywhere else opens the card.
    if (editable && !coverOnly && flipTarget <= 0) {
      const point = sceneRef.current?.pickPage(clientX, clientY, "right")
      if (point && point.v >= COVER_TITLE_ZONE) {
        openPageAt(0, point, { x: clientX, y: clientY })
        return
      }
    }
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
      openPageAt(
        page,
        sceneRef.current?.pickPage(clientX, clientY, side) ?? null,
        { x: clientX, y: clientY },
      )
    } else if (flipTarget <= 0) {
      // A closed card opens wherever it is clicked (the cover sits in the middle).
      step(1)
    } else if (flipTarget >= leafCount) {
      step(-1)
    } else step(xFraction < 0.5 ? -1 : 1)
  }

  /**
   * Opens a page for editing from a click on the 3D card. A text field under the click is
   * focused straight away, inside the click itself, rather than once the camera arrives:
   * browsers only reliably focus (and phones only raise the keyboard) during a user gesture.
   * Other clicks (such as placing a note on blank page) replay once the editor is in place.
   */
  const openPageAt = (
    page: number,
    point: PagePoint | null,
    tap?: { x: number; y: number },
  ) => {
    pendingClickRef.current = point
    flushSync(() => editPageAt(page))
    const editor = editorRef.current
    if (!point || !editor) return
    const x = point.u * PAGE_WIDTH_PX
    const y = point.v * PAGE_HEIGHT_PX
    // The editor has not been mapped onto the page yet, so lay it out flat for a moment and
    // click at the matching point: a field puts its caret where the page was clicked, and a
    // blank spot places a note there. Doing it inside the click lets phones raise the
    // keyboard for it.
    const transform = editor.style.transform
    const pointerEvents = editor.style.pointerEvents
    editor.style.transform = "none"
    editorFlatRef.current = true
    try {
      const field = nearestFieldInFlatEditor(editor, x, y)
      const box = editor.getBoundingClientRect()
      let clientX = box.left + x
      let clientY = box.top + y
      let target: Element | null = field
      if (!target && tap) {
        // Nothing to type into there: shift the flat editor so the point is under the
        // pointer (on screen) and click whatever is there.
        editor.style.transform = `translate(${tap.x - clientX}px, ${tap.y - clientY}px)`
        editor.style.pointerEvents = "auto"
        clientX = tap.x
        clientY = tap.y
        const hit = document.elementFromPoint(clientX, clientY)
        target = hit && editor.contains(hit) ? hit : null
      }
      if (!target) return
      pendingClickRef.current = null
      const clicked = target
      flushSync(() => {
        clicked.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX,
            clientY,
          }),
        )
      })
    } finally {
      editorFlatRef.current = false
      editor.style.transform = transform
      editor.style.pointerEvents = pointerEvents
    }
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
            cardBookFrameClass(coverOnly, editable),
            editable && editPage === null && "cursor-pointer",
          )}
          onPointerDown={onPointerDown}
          onClick={onContainerClick}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, false)}
          onPointerCancel={(e) => endPointer(e, true)}
          onPointerLeave={() => {
            live.current.tiltTarget = { x: 0, y: 0 }
          }}
          onKeyDown={onKeyDown}
        >
          <span ref={fontProbeRef} className="hidden" aria-hidden />
          {placeholderGone ? null : (
            <ClosedCardCover
              imageUrl={coverUrl}
              headline={headline}
              recipientName={recipientName}
            />
          )}
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
                "absolute top-0 left-0 origin-top-left",
                // Fade in once in place; vanish at once when the page moves off.
                overlayReady
                  ? "pointer-events-auto opacity-100 transition-opacity duration-150 motion-reduce:transition-none"
                  : "opacity-0",
              )}
              style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
              onKeyDown={(e) => {
                // Popups the editor portals out (e.g. the AI prompt) handle their own Escape.
                if (
                  e.key === "Escape" &&
                  e.currentTarget.contains(e.target as Node)
                ) {
                  editPageAt(null)
                }
              }}
            >
              <CardCanvasScaleContext.Provider value={editScale}>
                <CardCanvasPointContext.Provider value={toCanvasPoint}>
                  <PageEditorHost
                    render={renderPageEditor}
                    page={editPage}
                    width={PAGE_WIDTH_PX}
                    height={PAGE_HEIGHT_PX}
                    onPageChange={editPageAt}
                  />
                </CardCanvasPointContext.Provider>
              </CardCanvasScaleContext.Provider>
            </div>
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
              ? "Add two pages"
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

/** Slack around a text field (editor px) within which a click still counts as on it. */
const TEXT_FIELD_SLOP = 14

/**
 * The inline text field at (or within a few px of) a point in the editor's own layout, found
 * from offsets so it does not depend on hit testing through the 3D transform.
 */
/**
 * How far the page must scroll (px, down is positive) for the focused note in the editor to
 * be in the visible part of the screen: above an on-screen keyboard and below a sticky or
 * fixed header. Zero when it already is, or when nothing in the editor is focused.
 */
function focusedNoteOffset(editor: HTMLElement | null): number {
  const active = document.activeElement
  if (!editor || !(active instanceof HTMLElement) || !editor.contains(active)) {
    return 0
  }
  const box = (
    active.closest<HTMLElement>("[data-draggable-note]") ?? active
  ).getBoundingClientRect()
  const viewport = window.visualViewport
  const viewTop = viewport?.offsetTop ?? 0
  const viewBottom = viewTop + (viewport?.height ?? window.innerHeight)
  let top = viewTop + REVEAL_MARGIN_PX
  const header = document.querySelector("header")
  if (header) {
    const position = getComputedStyle(header).position
    if (position === "sticky" || position === "fixed") {
      top = Math.max(
        top,
        header.getBoundingClientRect().bottom + REVEAL_MARGIN_PX,
      )
    }
  }
  const bottom = viewBottom - REVEAL_MARGIN_PX
  let offset = 0
  if (box.bottom > bottom) offset = box.bottom - bottom
  // A note taller than the space shows from its top.
  if (box.top - offset < top) offset = box.top - top
  return Math.abs(offset) < 1 ? 0 : offset
}

/**
 * Brings the focused note into view if it is hidden. First the way typing does: setting the
 * caret again makes phone browsers scroll it into view themselves. If that does not move it,
 * the page jumps (without animating) to show it.
 */
function revealFocusedNote(editor: HTMLElement | null) {
  if (focusedNoteOffset(editor) === 0) return
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0).cloneRange()
    selection.removeAllRanges()
    selection.addRange(range)
  }
  window.setTimeout(() => {
    const offset = focusedNoteOffset(editor)
    if (offset !== 0) window.scrollBy({ top: offset, behavior: "auto" })
  }, CARET_REVEAL_WAIT_MS)
}

function nearestTextField(
  editor: HTMLElement,
  x: number,
  y: number,
): HTMLElement | null {
  // Measured on screen with the editor laid out flat for a moment: notes sit in different
  // positioned wrappers, so layout offsets do not all lead back to the editor.
  const transform = editor.style.transform
  editor.style.transform = "none"
  try {
    return nearestFieldInFlatEditor(editor, x, y)
  } finally {
    editor.style.transform = transform
  }
}

function nearestFieldInFlatEditor(
  editor: HTMLElement,
  x: number,
  y: number,
): HTMLElement | null {
  const origin = editor.getBoundingClientRect()
  let best: HTMLElement | null = null
  let bestDistance = TEXT_FIELD_SLOP
  for (const field of editor.querySelectorAll<HTMLElement>(
    "[data-inline-edit]",
  )) {
    // Anywhere on a note (its padding or GIF) counts as its text.
    const box = (
      field.closest<HTMLElement>("[data-draggable-note]") ?? field
    ).getBoundingClientRect()
    if (box.width === 0 && box.height === 0) continue
    const left = box.left - origin.left
    const top = box.top - origin.top
    const dx = Math.max(left - x, 0, x - (left + box.width))
    const dy = Math.max(top - y, 0, y - (top + box.height))
    const distance = Math.hypot(dx, dy)
    if (distance <= bestDistance) {
      best = field
      bestDistance = distance
    }
  }
  return best
}

/**
 * A point on a leaf's visible face as the vertex shader bends it: `s` runs from the spine
 * (0) to the fore-edge (`PAGE_W`); height is unchanged by the bend.
 */
function pageSurface(progress: number, curl: number, lift: number, side: Side) {
  const base = progress * Math.PI
  const k = (-curl * Math.sin(base)) / PAGE_W
  const off = (side === "right" ? 1 : -1) * (LEAF_THICKNESS / 2)
  return (s: number) => {
    const a = base + k * s
    const x =
      Math.abs(k) < 1e-5
        ? Math.cos(base) * s
        : (Math.sin(a) - Math.sin(base)) / k
    const z =
      Math.abs(k) < 1e-5
        ? Math.sin(base) * s
        : (Math.cos(base) - Math.cos(a)) / k
    return { x: x - Math.sin(a) * off, z: z + lift + Math.cos(a) * off }
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
): {
  images: ReadonlyMap<string, HTMLImageElement>
  /** Images that could not be loaded (the painted fallback stays). */
  failed: ReadonlySet<string>
} {
  const [images, setImages] = useState<ReadonlyMap<string, HTMLImageElement>>(
    () => new Map(),
  )
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const key = urls.join("\n")

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const created: HTMLImageElement[] = []
    const wanted = new Set(key.split("\n"))
    for (const url of wanted) {
      const img = new Image()
      img.decoding = "async"
      if (!url.startsWith("data:")) img.crossOrigin = "anonymous"
      img.alt = ""
      img.onload = () => {
        if (cancelled) return
        // Drop images no longer in use (e.g. replaced covers, which can be large data URLs).
        setImages((prev) => {
          const next = new Map(
            [...prev].filter(([existing]) => wanted.has(existing)),
          )
          return next.set(url, img)
        })
      }
      // A failed load (e.g. a host without CORS) leaves the painted fallback in place.
      img.onerror = () => {
        img.remove()
        if (!cancelled) setFailed((prev) => new Set(prev).add(url))
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

  return { images, failed }
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
