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
} from "@/lib/card-book"
import type { Contribution } from "@/lib/card-body"
import { MESSAGE_FONT_PRESETS } from "@/lib/message-font-presets"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight } from "lucide-react"
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
import { createPageMaterial, type PageMaterial } from "./page-shader"

/** World units: one page is 1 wide; height keeps the 4:5 card ratio. */
const PAGE_W = 1
const PAGE_H = (PAGE_W * PAGE_HEIGHT_PX) / PAGE_WIDTH_PX
/** Gap between stacked leaves so they never z-fight. */
const LEAF_GAP = 0.003
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
  className?: string
  /** Rendered instead of the 3D card when WebGL is unavailable. */
  fallback?: ReactNode
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
 * Read-only by design; editing stays on the DOM-based `Card3D`.
 */
export function CardBook3D({
  imageUrl,
  headline,
  message,
  recipientName,
  contributions = [],
  extraPages = 0,
  messageFontSize = 18,
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
  const [flipTarget, setFlipTarget] = useState(0)
  const [focus, setFocus] = useState<Side>("right")
  const [narrow, setNarrow] = useState(false)
  const [fontsVersion, setFontsVersion] = useState(0)

  const live = useRef<LiveState>({
    flip: 0,
    target: 0,
    focus: "right",
    narrow: false,
    reducedMotion: false,
    camX: PAGE_W / 2,
    fitW: PAGE_W,
    tilt: { x: 0, y: 0 },
    tiltTarget: { x: 0, y: 0 },
    dirty: true,
    pointer: null,
  })

  const { totalPages, validMessagePage } = useMemo(
    () => computeNaturalPageSpread(false, 1, contributions, extraPages),
    [contributions, extraPages],
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

    const leafGeometry = new PlaneGeometry(PAGE_W, PAGE_H, 48, 1)
    leafGeometry.translate(PAGE_W / 2, 0, 0)
    const leaves: Leaf[] = []
    for (let i = 0; i < leafTotal; i++) {
      const material = createPageMaterial(
        faceTextures[i * 2],
        faceTextures[i * 2 + 1],
        PAGE_W,
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
      const dt = Math.min(0.05, (now - last) / 1000)
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

      leaves.forEach(({ material }, i) => {
        const p = leafProgress(state.flip, i)
        material.uniforms.uProgress.value = p
        const restZ = -i * LEAF_GAP
        const turnedZ = -(leafTotal - 1 - i) * LEAF_GAP
        material.uniforms.uLift.value = restZ + (turnedZ - restZ) * p
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

      const tiltTarget = state.reducedMotion ? { x: 0, y: 0 } : state.tiltTarget
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

      if (!moving) return

      const left = -Math.min(1, state.flip) * PAGE_W
      const right = Math.min(1, leafTotal - state.flip) * PAGE_W
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
      const yaw = state.tilt.x * 0.22
      const pitch = 0.08 - state.tilt.y * 0.12
      camera.position.set(
        state.camX + distance * Math.sin(yaw) * Math.cos(pitch),
        distance * Math.sin(pitch),
        distance * Math.cos(yaw) * Math.cos(pitch),
      )
      camera.lookAt(state.camX, 0, 0)
      renderer.render(scene, camera)
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
    const rect = e.currentTarget.getBoundingClientRect()
    step(e.clientX - rect.left < rect.width / 2 ? -1 : 1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      step(1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      step(-1)
    }
  }

  if (webglFailed) return <>{fallback}</>

  return (
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      <div
        ref={containerRef}
        role="group"
        aria-roledescription="3D card"
        aria-label={`Card for ${recipientName}. Use the arrow keys or drag to turn pages.`}
        tabIndex={0}
        className="relative aspect-4/5 w-full cursor-grab touch-pan-y rounded-2xl outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing sm:aspect-4/3"
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

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => step(-1)}
          disabled={!canGoPrev}
          aria-label="Previous page"
        >
          <ArrowLeft />
        </Button>
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
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => step(1)}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          <ArrowRight />
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
