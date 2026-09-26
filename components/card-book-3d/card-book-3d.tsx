"use client"

import { Button } from "@/components/ui/button"
import { computeNaturalPageSpread } from "@/components/card-3d/card-page-spread"
import {
  bookCenterOffset,
  buildBookFaces,
  leafCountForFaces,
  leafProgress,
  openness,
  settleFlipTarget,
  spreadForPage,
} from "@/lib/card-book"
import type { Contribution } from "@/lib/card-body"
import { MESSAGE_FONT_PRESETS } from "@/lib/message-font-presets"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react"
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
  SRGBColorSpace,
  WebGLRenderer,
} from "three"
import {
  buildNotesByPage,
  faceHasGif,
  faceImageUrls,
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
 * turn), like a card standing open on a table. Pages flatten while one is being edited.
 */
const REST_FOLD = 0.085
/** Largest editor page (CSS px); matches the flat card's max width. */
const MAX_EDIT_PAGE_WIDTH = PAGE_WIDTH_PX
const EDIT_PAGE_MARGIN = 24
/** Peak darkening a lifted page casts on the page beneath it. */
const TURN_SHADOW = 0.38
const CAMERA_FOV = 30
const FRAME_MARGIN_W = 1.14
const FRAME_MARGIN_H = 1.2
const DRAG_THRESHOLD_PX = 8
/** Horizontal drag distance (in page widths) for one full turn. */
const DRAG_PAGES_PER_TURN = 1.6
const GIF_REPAINT_MS = 90

type Side = "left" | "right"

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

type EditLayout = {
  /** Editor page size in CSS px. */
  width: number
  height: number
  containerWidth: number
  containerHeight: number
}

type Leaf = { mesh: Mesh; material: PageMaterial }

type SceneHandle = {
  faceCanvases: HTMLCanvasElement[]
  faceTextures: CanvasTexture[]
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
  /** A page is open for editing: camera faces it head-on at exact editor size. */
  editing: boolean
  /** 0 = browsing camera, 1 = editing camera (eased). */
  editBlend: number
  /** Container height and editor page height in px, to size the editing camera. */
  viewH: number
  editH: number
  overlayReady: boolean
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
  contributions = [],
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
  const gifFacesRef = useRef<number[]>([])

  const [webglFailed, setWebglFailed] = useState(false)
  const editable = Boolean(renderPageEditor)
  const [editPage, setEditPage] = useState<number | null>(
    editable && autoEditPage !== undefined ? autoEditPage : null,
  )
  const [overlayReady, setOverlayReady] = useState(false)
  const [editLayout, setEditLayout] = useState<EditLayout | null>(null)
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
    viewH: 0,
    editH: 0,
    overlayReady: false,
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
      layoutWidth: editable ? editLayout?.width : undefined,
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
      editable,
      editLayout?.width,
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

  // Canvas text only uses a web font once it has loaded; repaint when they arrive.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return
    let cancelled = false
    const families = new Set<string>([fontFamily(null)])
    for (const notes of content.notesByPage.values()) {
      for (const n of notes) families.add(fontFamily(n.fontPresetId))
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
  }, [content, fontFamily])

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
    sceneRef.current = { faceCanvases, faceTextures }

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
      const editWidth = Math.floor(
        Math.min(
          MAX_EDIT_PAGE_WIDTH,
          width - EDIT_PAGE_MARGIN,
          (height - EDIT_PAGE_MARGIN) / (PAGE_H / PAGE_W),
        ),
      )
      const editHeight = editWidth * (PAGE_H / PAGE_W)
      state.viewH = height
      state.editH = editHeight
      setEditLayout((prev) =>
        prev &&
        prev.width === editWidth &&
        prev.containerWidth === width &&
        prev.containerHeight === height
          ? prev
          : {
              width: editWidth,
              height: editHeight,
              containerWidth: width,
              containerHeight: height,
            },
      )
      state.dirty = true
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

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

      // Open pages rest slightly raised off the table; they flatten for editing.
      const fold =
        REST_FOLD * openness(state.flip, leafTotal) * (1 - state.editBlend)
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
      const gifFaces = gifFacesRef.current
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

      // Editing camera: square on to the page being edited, at the distance where the page
      // spans exactly the editor's pixel height, so the DOM editor lines up with it.
      const editSide: Side =
        state.target <= 0
          ? "right"
          : state.target >= leafTotal
            ? "left"
            : state.focus
      const editX = editSide === "right" ? PAGE_W / 2 : -PAGE_W / 2
      const editLeaf = editSide === "right" ? state.target : state.target - 1
      const faceZ =
        (editSide === "right"
          ? -editLeaf * LEAF_GAP
          : -(leafTotal - 1 - editLeaf) * LEAF_GAP) +
        LEAF_THICKNESS / 2
      const editDistance =
        state.editH > 0
          ? (PAGE_H * state.viewH) / (2 * Math.tan(halfFov) * state.editH)
          : distance
      const b = state.editBlend * state.editBlend * (3 - 2 * state.editBlend)
      const mix = (a: number, c: number) => a + (c - a) * b
      camera.position.set(
        mix(browseX, editX),
        mix(browseY, 0),
        mix(browseZ, faceZ + editDistance),
      )
      camera.lookAt(mix(state.camX, editX), 0, mix(0, faceZ))
      renderer.render(scene, camera)

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
    faces.forEach((_, i) => paint(i))
    live.current.dirty = true
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

  /** Open a card page for editing (null closes the editor). */
  const editPageAt = useCallback(
    (page: number | null) => {
      if (page === null) {
        setEditPage(null)
        return
      }
      const clamped = Math.min(totalPages - 1, Math.max(0, page))
      setEditPage(clamped)
      goTo(spreadForPage(clamped), clamped % 2 === 1 ? "left" : "right")
    },
    [totalPages, goTo],
  )

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
    if (flipTarget <= 0) page = 0
    else if (flipTarget >= leafCount) return null
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
    if (page !== null) editPageAt(page)
    else step(xFraction < 0.5 ? -1 : 1)
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
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      <div className="relative w-full">
        <div
          ref={containerRef}
          role="group"
          aria-roledescription="3D card"
          aria-label={
            editable
              ? `Card for ${recipientName}. Click a page to edit it; use the arrow keys to move between pages and Escape to finish.`
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
        {renderPageEditor && editPage !== null && editLayout ? (
          <div
            className={cn(
              "absolute z-10 transition-opacity duration-200 motion-reduce:transition-none",
              overlayReady ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            style={{
              left: (editLayout.containerWidth - editLayout.width) / 2,
              top: (editLayout.containerHeight - editLayout.height) / 2,
              width: editLayout.width,
              height: editLayout.height,
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") editPageAt(null)
            }}
          >
            <PageEditorHost
              render={renderPageEditor}
              page={editPage}
              width={editLayout.width}
              height={editLayout.height}
              onPageChange={editPageAt}
            />
          </div>
        ) : null}
        {editable && editPage === null ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-xs text-muted-foreground">
            Click a page to edit it
          </p>
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
        {editPage !== null ? (
          <Button
            type="button"
            size="sm"
            onClick={() => editPageAt(null)}
            className="rounded-full"
          >
            <Check />
            Done
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {Array.from({ length: leafCount + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i, i === 0 ? "right" : "left")}
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
        )}
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
