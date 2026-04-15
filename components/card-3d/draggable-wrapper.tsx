"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react"
import { Maximize2, Move } from "lucide-react"

/** Used to center the compose block on click before first layout (field + controls). */
export const COMPOSE_DRAFT_ESTIMATE_HEIGHT_PX = 108

/** Matches padding used in `DraggableWrapper` clamping (inside the positioning box). */
export const CANVAS_EDGE_PADDING = 12

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
      boundsRect.width -
      args.padding -
      (rotatedRect.right - outerRect.left)
    minY = args.padding - dt
    maxY =
      boundsRect.height -
      args.padding -
      (rotatedRect.bottom - outerRect.top)
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
  isActive = true,
  initialOffset,
  initialWidthPercent,
  rotationDegrees = 0,
  onLayoutCommit,
  footer,
  onFocusLeave,
}: {
  children: ReactNode
  editable?: boolean
  isActive?: boolean
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
  const [isResizing, setIsResizing] = useState(false)
  const [dragStarted, setDragStarted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rotatedInnerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, posX: 0, posY: 0, width: 100 })
  const DRAG_THRESHOLD = 5
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
        const active = document.activeElement
        if (active instanceof Node && el.contains(active)) return
        onFocusLeaveRef.current()
      }

      // `relatedTarget` is often null when the focused control unmounts (e.g. sparkle → AI prompt)
      // or when clicking a non-focusable surface. Defer so `autoFocus` on the next control wins.
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

  const handleMouseDown = (e: ReactMouseEvent, type: "drag" | "resize") => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()

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

    if (type === "drag") setIsDragging(true)
    if (type === "resize") setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y

        if (!dragStarted) {
          if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD)
            return
          setDragStarted(true)
        }

        if (containerRef.current) {
          const bounds = getDraggableBoundsParent(containerRef.current)
          if (bounds) {
            const nextX = startPos.current.posX + dx
            const nextY = startPos.current.posY + dy
            setPosition(
              clampNotePositionInBounds({
                bounds,
                containerEl: containerRef.current,
                rotatedInnerEl: rotatedInnerRef.current,
                padding: CANVAS_PADDING,
                x: nextX,
                y: nextY,
              }),
            )
          } else {
            setPosition({
              x: startPos.current.posX + dx,
              y: startPos.current.posY + dy,
            })
          }
        }
      }
      if (isResizing && containerRef.current) {
        const bounds = getDraggableBoundsParent(containerRef.current)
        const canvasWidth = bounds
          ? bounds.clientWidth - CANVAS_PADDING * 2
          : containerRef.current.parentElement?.offsetWidth || 300
        const currentLeft = position.x ?? 0
        const maxWidthPx = canvasWidth - currentLeft - CANVAS_PADDING
        const dx = e.clientX - startPos.current.x
        const newWidthPx = (startPos.current.width / 100) * canvasWidth + dx
        const clampedWidthPx = Math.max(
          canvasWidth * 0.3,
          Math.min(maxWidthPx, newWidthPx),
        )
        setSize({ width: (clampedWidthPx / canvasWidth) * 100 })
      }
    }

    const handleMouseUp = () => {
      if (
        onLayoutCommit &&
        position.x !== null &&
        position.y !== null &&
        (isDragging || isResizing)
      ) {
        onLayoutCommit({
          x: position.x,
          y: position.y,
          widthPercent: size.width,
        })
      }
      setIsDragging(false)
      setIsResizing(false)
      setDragStarted(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    isDragging,
    isResizing,
    dragStarted,
    onLayoutCommit,
    position.x,
    position.y,
    size.width,
    CANVAS_PADDING,
    rotationDegrees,
  ])

  // Depend on coordinates, not `initialOffset` identity — parents often pass
  // `{ x, y }` inline so the object is new every render; font/color updates
  // must not re-run this and snap the note back to the last prop snapshot.
  const initialX = initialOffset?.x
  const initialY = initialOffset?.y
  useEffect(() => {
    if (typeof initialX !== "number" || typeof initialY !== "number") return
    queueMicrotask(() => {
      setPosition({ x: initialX, y: initialY })
    })
  }, [initialX, initialY])

  useEffect(() => {
    if (typeof initialWidthPercent !== "number") return
    queueMicrotask(() => {
      setSize({ width: initialWidthPercent })
    })
  }, [initialWidthPercent])

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
      setPosition(clamped)
    }
  }, [rotationDegrees, size.width, position.x, position.y, CANVAS_PADDING])

  const isPositioned = position.x !== null && position.y !== null

  return (
    <div
      ref={containerRef}
      className="relative"
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
        {editable && isActive && (
          <>
            <div
              role="button"
              tabIndex={-1}
              data-note-chrome
              aria-label="Move note"
              onMouseDown={(e) => handleMouseDown(e, "drag")}
              className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 cursor-move rounded-full border border-border bg-background p-1 opacity-0 shadow-sm transition-opacity outline-none group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Move className="h-3 w-3 text-muted-foreground" />
            </div>

            <div
              role="button"
              tabIndex={-1}
              data-note-chrome
              aria-label="Resize note"
              onMouseDown={(e) => handleMouseDown(e, "resize")}
              className="absolute -right-2 -bottom-2 z-10 cursor-se-resize rounded-full border border-border bg-background p-1 opacity-0 shadow-sm transition-opacity outline-none group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            </div>

            <div className="pointer-events-none absolute inset-0 -m-2 rounded border border-dashed border-primary/30 p-2 transition-colors group-hover:border-primary/50" />
          </>
        )}
        {children}
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
