"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DraggableNoteMoveContext,
  type DraggableNoteMoveContextValue,
} from "./draggable-note-context"

/** Used to center the compose block on click before first layout (field + controls). */
export const COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX = 108

/** Matches padding used in `DraggableWrapper` clamping (inside the positioning box). */
export const CANVAS_EDGE_PADDING = 12

const DRAG_THRESHOLD_PX = 5

type GesturePhase = "none" | "pending" | "drag" | "resize"

function pastDragThreshold(dx: number, dy: number): boolean {
  return Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX
}

/** Containing block for `position: absolute` on the draggable — same box `left`/`top` use. */
function getDraggableBoundsParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null
  const fromOffset = el.offsetParent as HTMLElement | null
  if (fromOffset) return fromOffset
  return el.closest("[data-card-canvas]") as HTMLElement | null
}

/** Clamps note `left`/`top` (px) so the outer box — or rotated inner AABB — stays inside padded bounds. */
function clampNotePositionInBounds(args: {
  bounds: HTMLElement
  containerEl: HTMLElement
  rotatedInnerEl: HTMLElement | null
  padding: number
  x: number
  y: number
}): { x: number; y: number } {
  const boundsRect = args.bounds.getBoundingClientRect()
  const outerRect = args.containerEl.getBoundingClientRect()
  const rotatedRect = args.rotatedInnerEl?.getBoundingClientRect()

  let minX = args.padding
  let maxX = boundsRect.width - outerRect.width - args.padding
  let minY = args.padding
  let maxY = boundsRect.height - outerRect.height - args.padding

  if (rotatedRect && args.rotatedInnerEl) {
    const dl = rotatedRect.left - outerRect.left
    const dt = rotatedRect.top - outerRect.top
    minX = args.padding - dl
    maxX =
      boundsRect.width - args.padding - (rotatedRect.right - outerRect.left)
    minY = args.padding - dt
    maxY =
      boundsRect.height - args.padding - (rotatedRect.bottom - outerRect.top)
  }

  return {
    x: Math.max(minX, Math.min(maxX, args.x)),
    y: Math.max(minY, Math.min(maxY, args.y)),
  }
}

// Draggable wrapper for positioning content
export function DraggableWrapper({
  children,
  editable = false,
  initialOffset,
  initialWidthPercent,
  rotationDegrees = 0,
  onLayoutCommit,
  footer,
  onFocusLeave,
}: {
  children: ReactNode
  editable?: boolean
  /** Pixel `left`/`top` inside the positioning containing block (same as click-to-place overlay when it aligns). */
  initialOffset?: { x: number; y: number }
  /** Default 100; placed notes often use ~75 */
  initialWidthPercent?: number
  /** Slight tilt in degrees; defaults to 0 */
  rotationDegrees?: number
  onLayoutCommit?: (layout: {
    x: number
    y: number
    widthPercent: number
  }) => void
  /** Renders below the note; positioned to span the card canvas width while moving with the draggable. */
  footer?: ReactNode
  /**
   * Fires when focus leaves this wrapper (message + footer toolbar). Needed because the footer is
   * outside the message subtree; `blur` on the message alone does not run when closing from toolbar controls.
   */
  onFocusLeave?: () => void
}) {
  const [position, setPosition] = useState<{
    x: number | null
    y: number | null
  }>(() => ({
    x: initialOffset?.x ?? null,
    y: initialOffset?.y ?? null,
  }))
  const [size, setSize] = useState({
    width: initialWidthPercent ?? (initialOffset ? 75 : 100),
  })
  const [isDragging, setIsDragging] = useState(false)
  const [pendingDrag, setPendingDrag] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStarted, setDragStarted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rotatedInnerRef = useRef<HTMLDivElement>(null)
  const pointerCaptureRef = useRef<{
    el: HTMLElement
    pointerId: number
  } | null>(null)
  const startPos = useRef({ x: 0, y: 0, posX: 0, posY: 0, width: 100 })
  const gesturePhaseRef = useRef<GesturePhase>("none")
  const layoutSnapshotRef = useRef({
    x: null as number | null,
    y: null as number | null,
    widthPercent: initialWidthPercent ?? (initialOffset ? 75 : 100),
  })
  const CANVAS_PADDING = CANVAS_EDGE_PADDING

  const [footerPlacement, setFooterPlacement] = useState<{
    left: number
    width: number
  } | null>(null)

  const onFocusLeaveRef = useRef(onFocusLeave)
  useEffect(() => {
    onFocusLeaveRef.current = onFocusLeave
  }, [onFocusLeave])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: FocusEvent) => {
      if (!onFocusLeaveRef.current) return
      const next = e.relatedTarget as Node | null
      if (next && el.contains(next)) return

      const runLeave = () => {
        if (!onFocusLeaveRef.current) return
        if (!el.isConnected) return
        const active = document.activeElement
        if (active instanceof Node && el.contains(active)) return
        onFocusLeaveRef.current()
      }

      if (next == null) {
        window.setTimeout(runLeave, 0)
        return
      }

      runLeave()
    }
    el.addEventListener("focusout", handler)
    return () => el.removeEventListener("focusout", handler)
  }, [])

  const hasFooter = footer != null && footer !== false

  useLayoutEffect(() => {
    if (!hasFooter) {
      queueMicrotask(() => {
        setFooterPlacement(null)
      })
      return
    }
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const bounds = getDraggableBoundsParent(el)
      if (!bounds) {
        setFooterPlacement(null)
        return
      }
      const boundsRect = bounds.getBoundingClientRect()
      const cr = el.getBoundingClientRect()
      const leftInBounds = cr.left - boundsRect.left
      setFooterPlacement({
        left: CANVAS_PADDING - leftInBounds,
        width: Math.max(0, bounds.clientWidth - 2 * CANVAS_PADDING),
      })
    }

    queueMicrotask(update)
    const bounds = getDraggableBoundsParent(el)
    const ro = new ResizeObserver(() => {
      queueMicrotask(update)
    })
    ro.observe(el)
    if (bounds) ro.observe(bounds)
    return () => ro.disconnect()
  }, [hasFooter, position.x, position.y, size.width, CANVAS_PADDING])

  const releasePointerCapture = useCallback(() => {
    const capture = pointerCaptureRef.current
    if (!capture) return
    if (capture.el.hasPointerCapture(capture.pointerId)) {
      capture.el.releasePointerCapture(capture.pointerId)
    }
    pointerCaptureRef.current = null
  }, [])

  const syncLayoutSnapshot = useCallback(
    (patch: Partial<typeof layoutSnapshotRef.current>) => {
      layoutSnapshotRef.current = { ...layoutSnapshotRef.current, ...patch }
    },
    [],
  )

  const handlePointerDown = useCallback(
    (
      e: ReactPointerEvent,
      type: "drag" | "resize",
      options?: { deferUntilDrag?: boolean },
    ) => {
      if (!editable) return
      e.stopPropagation()

      const deferUntilDrag = options?.deferUntilDrag === true && type === "drag"
      if (!deferUntilDrag) {
        e.preventDefault()
      }

      const handle = e.currentTarget as HTMLElement
      handle.setPointerCapture(e.pointerId)
      pointerCaptureRef.current = { el: handle, pointerId: e.pointerId }

      let currentPosX = position.x
      let currentPosY = position.y
      if (
        (currentPosX === null || currentPosY === null) &&
        containerRef.current
      ) {
        const bounds = getDraggableBoundsParent(containerRef.current)
        if (bounds) {
          const boundsRect = bounds.getBoundingClientRect()
          const selfRect = containerRef.current.getBoundingClientRect()
          currentPosX = selfRect.left - boundsRect.left
          currentPosY = selfRect.top - boundsRect.top
          setPosition({ x: currentPosX, y: currentPosY })
          syncLayoutSnapshot({ x: currentPosX, y: currentPosY })
        } else {
          currentPosX = 0
          currentPosY = 0
        }
      }

      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        posX: currentPosX ?? 0,
        posY: currentPosY ?? 0,
        width: size.width,
      }

      if (type === "drag") {
        if (deferUntilDrag) {
          gesturePhaseRef.current = "pending"
          setPendingDrag(true)
        } else {
          gesturePhaseRef.current = "drag"
          setIsDragging(true)
        }
      }
      if (type === "resize") {
        gesturePhaseRef.current = "resize"
        setIsResizing(true)
      }
    },
    [editable, position.x, position.y, size.width, syncLayoutSnapshot],
  )

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      let dragging = isDragging

      if (gesturePhaseRef.current === "pending") {
        if (!pastDragThreshold(dx, dy)) return
        e.preventDefault()
        window.getSelection()?.removeAllRanges()
        gesturePhaseRef.current = "drag"
        setPendingDrag(false)
        setIsDragging(true)
        setDragStarted(true)
        dragging = true
      }

      if (dragging) {
        if (!dragStarted) {
          if (!pastDragThreshold(dx, dy)) return
          e.preventDefault()
          setDragStarted(true)
        }

        if (containerRef.current) {
          const bounds = getDraggableBoundsParent(containerRef.current)
          if (bounds) {
            const nextX = startPos.current.posX + dx
            const nextY = startPos.current.posY + dy
            const clamped = clampNotePositionInBounds({
              bounds,
              containerEl: containerRef.current,
              rotatedInnerEl: rotatedInnerRef.current,
              padding: CANVAS_PADDING,
              x: nextX,
              y: nextY,
            })
            syncLayoutSnapshot({ x: clamped.x, y: clamped.y })
            setPosition(clamped)
          } else {
            const next = {
              x: startPos.current.posX + dx,
              y: startPos.current.posY + dy,
            }
            syncLayoutSnapshot(next)
            setPosition(next)
          }
        }
      }

      if (gesturePhaseRef.current === "resize" && containerRef.current) {
        const bounds = getDraggableBoundsParent(containerRef.current)
        const canvasWidth = bounds
          ? bounds.clientWidth - CANVAS_PADDING * 2
          : containerRef.current.parentElement?.offsetWidth || 300
        const currentLeft = layoutSnapshotRef.current.x ?? position.x ?? 0
        const maxWidthPx = canvasWidth - currentLeft - CANVAS_PADDING
        const newWidthPx = (startPos.current.width / 100) * canvasWidth + dx
        const clampedWidthPx = Math.max(
          canvasWidth * 0.3,
          Math.min(maxWidthPx, newWidthPx),
        )
        const widthPercent = (clampedWidthPx / canvasWidth) * 100
        syncLayoutSnapshot({ widthPercent })
        setSize({ width: widthPercent })
      }
    }

    const handlePointerEnd = () => {
      const phase = gesturePhaseRef.current
      const snapshot = layoutSnapshotRef.current

      if (
        onLayoutCommit &&
        typeof snapshot.x === "number" &&
        typeof snapshot.y === "number" &&
        (phase === "drag" || phase === "resize")
      ) {
        onLayoutCommit({
          x: snapshot.x,
          y: snapshot.y,
          widthPercent: snapshot.widthPercent,
        })
      }

      gesturePhaseRef.current = "none"
      setPendingDrag(false)
      setIsDragging(false)
      setIsResizing(false)
      setDragStarted(false)
      releasePointerCapture()
    }

    if (isDragging || isResizing || pendingDrag) {
      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerEnd)
      window.addEventListener("pointercancel", handlePointerEnd)
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerEnd)
    }
  }, [
    isDragging,
    pendingDrag,
    isResizing,
    dragStarted,
    onLayoutCommit,
    position.x,
    CANVAS_PADDING,
    releasePointerCapture,
    syncLayoutSnapshot,
  ])

  const initialX = initialOffset?.x
  const initialY = initialOffset?.y
  useEffect(() => {
    if (typeof initialX !== "number" || typeof initialY !== "number") return
    queueMicrotask(() => {
      setPosition({ x: initialX, y: initialY })
      syncLayoutSnapshot({ x: initialX, y: initialY })
    })
  }, [initialX, initialY, syncLayoutSnapshot])

  useEffect(() => {
    if (typeof initialWidthPercent !== "number") return
    queueMicrotask(() => {
      setSize({ width: initialWidthPercent })
      syncLayoutSnapshot({ widthPercent: initialWidthPercent })
    })
  }, [initialWidthPercent, syncLayoutSnapshot])

  useLayoutEffect(() => {
    if (position.x === null || position.y === null) return
    const container = containerRef.current
    if (!container) return
    const bounds = getDraggableBoundsParent(container)
    if (!bounds) return

    const clamped = clampNotePositionInBounds({
      bounds,
      containerEl: container,
      rotatedInnerEl: rotatedInnerRef.current,
      padding: CANVAS_PADDING,
      x: position.x,
      y: position.y,
    })

    if (clamped.x !== position.x || clamped.y !== position.y) {
      syncLayoutSnapshot({ x: clamped.x, y: clamped.y })
      setPosition(clamped)
    }
  }, [
    rotationDegrees,
    size.width,
    position.x,
    position.y,
    CANVAS_PADDING,
    syncLayoutSnapshot,
  ])

  const isPositioned = position.x !== null && position.y !== null
  const isMovingNote = isDragging || pendingDrag
  const isGesturing = isMovingNote || isResizing

  const resizeHandleClassName =
    "absolute -right-3 -bottom-3 z-10 flex h-7 w-7 touch-none cursor-se-resize items-center justify-center rounded-full border border-border bg-background p-0.5 shadow-sm transition-opacity opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"

  const moveDragContext = useMemo(
    (): DraggableNoteMoveContextValue =>
      editable
        ? {
            onMovePointerDown: (e, options) =>
              handlePointerDown(e, "drag", options),
            isMovingNote,
          }
        : null,
    [editable, handlePointerDown, isMovingNote],
  )

  return (
    <div
      ref={containerRef}
      className={cn("relative", isGesturing && "touch-none select-none")}
      style={
        isPositioned
          ? {
              position: "absolute",
              left: position.x ?? 0,
              top: position.y ?? 0,
              width: `${size.width}%`,
            }
          : {
              width: editable ? `${size.width}%` : "100%",
            }
      }
    >
      <div
        ref={rotatedInnerRef}
        className="group relative transition-transform"
        style={{ transform: `rotate(${rotationDegrees}deg)` }}
      >
        {isResizing ? (
          <div
            className="pointer-events-none absolute inset-0 -m-2 rounded border border-dashed border-primary/50 p-2"
            aria-hidden
          />
        ) : null}
        {editable && (
          <div
            role="button"
            tabIndex={-1}
            data-note-chrome
            aria-label="Resize note"
            onPointerDown={(e) => handlePointerDown(e, "resize")}
            className={resizeHandleClassName}
          >
            <Maximize2 className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        )}
        <DraggableNoteMoveContext.Provider value={moveDragContext}>
          {children}
        </DraggableNoteMoveContext.Provider>
      </div>
      {footer && footerPlacement ? (
        <div
          className="pointer-events-auto z-20"
          style={{
            position: "absolute",
            top: "100%",
            left: footerPlacement.left,
            width: footerPlacement.width,
            marginTop: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {footer}
        </div>
      ) : footer ? (
        <div
          className="pointer-events-auto z-20 mt-3 w-full max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
}
