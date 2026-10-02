/** Brand coral first, then warm and cool accents that read on light and dark grounds. */
const COLORS = [
  "#ff5a4a",
  "#ffb020",
  "#ffd84a",
  "#2ec4b6",
  "#7c5cff",
  "#ff8fb1",
]

const GRAVITY = 1400
/** Share of velocity kept per second (air drag). */
const DRAG = 0.22
const DURATION_MS = 3200

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  round: boolean
  spin: number
  angle: number
  /** Phase of the paper's flutter (its apparent width swings as it tumbles). */
  flutter: number
  flutterRate: number
}

/**
 * Fires a one-off confetti burst from a point in the viewport (CSS px). Draws on its own
 * fixed, click-through canvas and removes it when the pieces have fallen. Does nothing when
 * the reader prefers reduced motion.
 */
export function burstConfetti(
  origin: { x: number; y: number },
  { count = 160 }: { count?: number } = {},
): void {
  if (typeof window === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "60",
  })
  document.body.appendChild(canvas)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
  }
  resize()
  window.addEventListener("resize", resize)

  // Scale the burst to the screen so it fills a phone without overshooting a desktop.
  const reach = Math.min(window.innerWidth, 900)
  const pieces: Piece[] = Array.from({ length: count }, () => {
    // Mostly upwards, fanning out to the sides.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15
    const speed = reach * (0.9 + Math.random() * 1.3)
    return {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.25,
      spin: (Math.random() - 0.5) * 14,
      angle: Math.random() * Math.PI * 2,
      flutter: Math.random() * Math.PI * 2,
      flutterRate: 6 + Math.random() * 8,
    }
  })

  const start = performance.now()
  let last = start
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    const elapsed = now - start
    const drag = Math.pow(DRAG, dt)
    // Fade everything out over the last stretch.
    const alpha = Math.min(1, (DURATION_MS - elapsed) / 600)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    ctx.globalAlpha = Math.max(alpha, 0)
    for (const p of pieces) {
      p.vx *= drag
      p.vy = p.vy * drag + GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.angle += p.spin * dt
      p.flutter += p.flutterRate * dt

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)
      ctx.scale(Math.cos(p.flutter), 1)
      ctx.fillStyle = p.color
      if (p.round) {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      }
      ctx.restore()
    }

    if (elapsed < DURATION_MS) {
      requestAnimationFrame(frame)
    } else {
      window.removeEventListener("resize", resize)
      canvas.remove()
    }
  }
  requestAnimationFrame(frame)
}
