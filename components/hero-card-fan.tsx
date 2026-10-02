"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"

/**
 * Cover cards fanned out behind the homepage browser mockup. The stage is a size
 * container laid out at 1000px wide, so card positions are in `cqw` (1cqw = 10px at
 * full size) and the fan scales down with the browser on narrower screens.
 *
 * Positions are card centres. `dx` / `dy` point back to the middle of the browser,
 * which is where each card is dealt from on load.
 */
const FAN_CARDS = [
  {
    src: "/occasions/farewell.webp",
    left: 8,
    top: 17.5,
    width: 40,
    rot: -16,
    dx: 42,
    dy: 15.5,
    delay: 490,
  },
  {
    src: "/occasions/birthday.webp",
    left: 50,
    top: 11,
    width: 44,
    rot: -2,
    dx: 0,
    dy: 22,
    delay: 350,
  },
  {
    src: "/occasions/wedding.webp",
    left: 92,
    top: 18.5,
    width: 40,
    rot: 14,
    dx: -42,
    dy: 14.5,
    delay: 570,
  },
] as const

type Tilt = { rx: number; ry: number; sc: number }

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

/** Cards turn toward the cursor as it gets close, then ease back when it leaves. */
function useProximityTilt() {
  const cards = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const motionOk = window.matchMedia(
      "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
    )
    if (!motionOk.matches) return

    const pointer = { x: 0, y: 0, inside: false }
    const tilts: Tilt[] = cards.current.map(() => ({ rx: 0, ry: 0, sc: 1 }))
    let raf = 0

    const tick = () => {
      let moving = false
      cards.current.forEach((el, i) => {
        if (!el) return
        const t = tilts[i]
        let rx = 0
        let ry = 0
        let sc = 1
        if (pointer.inside) {
          const r = el.getBoundingClientRect()
          const dx = pointer.x - (r.left + r.width / 2)
          const dy = pointer.y - (r.top + r.height / 2)
          const near = clamp(1 - Math.hypot(dx, dy) / (r.width * 1.5), 0, 1)
          const f = near * near * (3 - 2 * near)
          ry = clamp(dx / r.width, -1, 1) * 12 * f
          rx = -clamp(dy / r.height, -1, 1) * 9 * f
          sc = 1 + 0.025 * f
        }
        t.rx += (rx - t.rx) * 0.1
        t.ry += (ry - t.ry) * 0.1
        t.sc += (sc - t.sc) * 0.1
        if (
          Math.abs(rx - t.rx) > 0.01 ||
          Math.abs(ry - t.ry) > 0.01 ||
          Math.abs(sc - t.sc) > 0.0001
        ) {
          moving = true
        }
        el.style.transform = `perspective(1000px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg) scale(${t.sc.toFixed(4)})`
      })
      raf = moving ? requestAnimationFrame(tick) : 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.inside = true
      wake()
    }
    const onLeave = () => {
      pointer.inside = false
      wake()
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("scroll", wake, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", wake)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return cards
}

export function HeroCardFan({ children }: { children: ReactNode }) {
  const cards = useProximityTilt()

  return (
    <div className="@container relative">
      <div aria-hidden className="hidden md:block">
        {FAN_CARDS.map((card, i) => (
          <div
            key={card.src}
            className="hero-fan-deal absolute aspect-4/5"
            style={
              {
                left: `${card.left}cqw`,
                top: `${card.top}cqw`,
                width: `${card.width}cqw`,
                transform: `translate(-50%, -50%) rotate(${card.rot}deg)`,
                animationDelay: `${card.delay}ms`,
                "--fan-dx": `${card.dx}cqw`,
                "--fan-dy": `${card.dy}cqw`,
              } as CSSProperties
            }
          >
            <div
              ref={(el) => {
                cards.current[i] = el
              }}
              className="absolute inset-0 overflow-hidden rounded-[6px_14px_14px_6px] shadow-[0_34px_60px_-30px_rgba(40,24,10,0.45),0_4px_10px_rgba(40,24,10,0.08)] will-change-transform"
            >
              <Image
                src={card.src}
                alt=""
                fill
                sizes="(min-width: 1120px) 440px, 44vw"
                className="object-cover"
              />
              {/* Spine shading and a soft edge highlight, like the 3D card covers */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(40,28,14,0.18)_0%,rgba(40,28,14,0)_7%,rgba(255,255,255,0)_92%,rgba(255,255,255,0.18)_100%)]" />
              <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
