"use client"

import Image from "next/image"
import Link from "next/link"
import { Caveat } from "next/font/google"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type {
  PhotoTemplateScene,
  PhotoTemplatesSectionData,
} from "@/lib/photo-templates-section"
import { cn } from "@/lib/utils"

const caveat = Caveat({ subsets: ["latin"], weight: "700", preload: false })

/** How long each scene shows before the next, in ms. */
const SCENE_MS = 3400

/** The stage is laid out in a 600 × 620 box, scaled to fit. */
const STAGE_W = 600
const STAGE_H = 620

/** The sample person's photo, in the stage's top-left corner (stage units). */
const AVATAR = { x: 24, y: 20, size: 116 }

type Placed = { cx: number; cy: number; w: number; deg: number }

const MAIN: Placed = { cx: 375, cy: 380, w: 320, deg: 3 }
const BACK_LEFT: Placed = { cx: 230, cy: 395, w: 260, deg: -9 }
const BACK_RIGHT: Placed = { cx: 480, cy: 345, w: 250, deg: 11 }

/** A 4:5 card centred on (cx, cy), as percentages of the stage. */
function cardStyle({ cx, cy, w, deg }: Placed): React.CSSProperties {
  return {
    left: `${((cx - w / 2) / STAGE_W) * 100}%`,
    top: `${((cy - w * 0.625) / STAGE_H) * 100}%`,
    width: `${(w / STAGE_W) * 100}%`,
    transform: `rotate(${deg}deg)`,
  }
}

/** Where the main card's face oval lands on the stage, after the card's rotation. */
function facePoint([fx, fy]: [number, number]): [number, number] {
  const h = MAIN.w * 1.25
  const r = (MAIN.deg * Math.PI) / 180
  const lx = (fx - 0.5) * MAIN.w
  const ly = (fy - 0.5) * h
  return [
    MAIN.cx + lx * Math.cos(r) - ly * Math.sin(r),
    MAIN.cy + lx * Math.sin(r) + ly * Math.cos(r),
  ]
}

/**
 * A hand-drawn arrow from the edge of a circle centred on `from` (diameter `size`) to
 * `gap` short of `to`: bowed to one side, with a loop a little past halfway.
 */
function curlPath(
  from: [number, number],
  to: [number, number],
  size: number,
  side: number,
  bow: number,
  gap: number,
): string {
  let ux = to[0] - from[0]
  let uy = to[1] - from[1]
  const length = Math.hypot(ux, uy)
  ux /= length
  uy /= length
  const start = [from[0] + ux * (size / 2 + 12), from[1] + uy * (size / 2 + 12)]
  const L = length - size / 2 - 12 - gap
  const nx = -uy * side
  const ny = ux * side
  const R = Math.max(14, Math.min(26, L * 0.1))
  const loopStart = 0.4
  const loopEnd = 0.7
  const pts: [number, number][] = []
  for (let i = 0; i <= 90; i++) {
    const t = i / 90
    let along = L * t
    let off = bow * Math.sin(Math.PI * t)
    if (t > loopStart && t < loopEnd) {
      const s = (t - loopStart) / (loopEnd - loopStart)
      along += R * Math.sin(2 * Math.PI * s)
      off += R * (1 - Math.cos(2 * Math.PI * s))
    }
    pts.push([
      start[0] + ux * along + nx * off,
      start[1] + uy * along + ny * off,
    ])
  }
  const end = pts[90]
  const prev = pts[84]
  const angle = Math.atan2(end[1] - prev[1], end[0] - prev[0])
  const head = 14
  const f = (q: [number, number]) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`
  const wing = (a: number): [number, number] => [
    end[0] - head * Math.cos(a),
    end[1] - head * Math.sin(a),
  ]
  return `M${pts.map(f).join(" L")} M${f(wing(angle - 0.5))} L${f(end)} L${f(wing(angle + 0.5))}`
}

function arrowTo(scene: PhotoTemplateScene): string {
  const centre: [number, number] = [
    AVATAR.x + AVATAR.size / 2,
    AVATAR.y + AVATAR.size / 2,
  ]
  return curlPath(centre, facePoint(scene.face), AVATAR.size, -1, 40, 30)
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Funny photo templates: the same sample person is "redrawn" into a new scene every few
 * seconds, with an arrow from their photo to the face in the scene. Hover or focus to
 * pause, or pick a thumbnail. The data comes from `lib/photo-templates-section.ts`.
 */
export function PhotoTemplatesSection({
  data,
}: {
  data: PhotoTemplatesSectionData
}) {
  const { scenes } = data
  const root = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  // Bumped by a thumbnail pick, to restart the timer from a full interval.
  const [restart, setRestart] = useState(0)
  // The scene last animated in, so scrolling back into view doesn't replay it.
  const animated = useRef<number | null>(null)

  const n = scenes.length
  const main = scenes[index % n]
  const backLeft = scenes[(index + n - 1) % n]
  const backRight = scenes[(index + 1) % n]

  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (paused || !visible || prefersReducedMotion()) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % n), SCENE_MS)
    return () => clearInterval(timer)
  }, [paused, visible, n, restart])

  // Each scene deals in the new card, redraws the arrow and pops the label.
  useEffect(() => {
    const el = root.current
    if (!el || !visible || animated.current === index) return
    const first = animated.current === null
    animated.current = index
    if (prefersReducedMotion()) return
    const anims: Animation[] = []
    const card = el.querySelector("[data-main]")
    if (card && !first) {
      anims.push(
        card.animate(
          [
            {
              opacity: 0,
              transform: "translate(-36px, 12px) rotate(-7deg) scale(0.96)",
            },
            { opacity: 1, transform: "none" },
          ],
          { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        ),
      )
    }
    el.querySelectorAll("[data-arrow]").forEach((arrow) =>
      anims.push(
        arrow.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: 850,
          delay: first ? 500 : 180,
          easing: "cubic-bezier(0.45, 0, 0.2, 1)",
          fill: "backwards",
        }),
      ),
    )
    const label = el.querySelector("[data-label]")
    if (label) {
      anims.push(
        label.animate(
          [
            { opacity: 0, transform: "rotate(-10deg) translateY(6px)" },
            { opacity: 1, transform: "rotate(-4deg)" },
          ],
          {
            duration: 420,
            delay: first ? 300 : 120,
            easing: "cubic-bezier(0.34, 1.5, 0.64, 1)",
            fill: "backwards",
          },
        ),
      )
    }
    const avatar = el.querySelector("[data-avatar]")
    if (avatar && first) {
      anims.push(
        avatar.animate(
          [
            { transform: "rotate(-4deg) scale(0)" },
            { transform: "rotate(-4deg) scale(1.08)", offset: 0.7 },
            { transform: "rotate(-4deg) scale(1)" },
          ],
          {
            duration: 520,
            easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
            fill: "backwards",
          },
        ),
      )
    }
    return () => anims.forEach((a) => a.cancel())
    // Runs per scene; the first run waits until the section scrolls into view.
  }, [index, visible])

  const pick = useCallback((i: number) => {
    setIndex(i)
    setRestart((r) => r + 1)
  }, [])

  const arrow = arrowTo(main)

  return (
    <section
      ref={root}
      id="photo-templates"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
      }}
      className="border-t border-border bg-background"
    >
      <div className="mx-auto grid max-w-360 grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-x-18 gap-y-12 px-6 py-20 md:px-15">
        <div className="flex max-w-140 flex-col">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            {data.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] text-balance md:text-4xl lg:text-5xl">
            {data.h1}
            <br />
            <span className="text-brand">{data.h2}</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
            {data.body}
          </p>

          <div
            className="mt-8 flex flex-wrap gap-2.5"
            role="group"
            aria-label="Scenes"
          >
            {scenes.map((scene, i) => {
              const active = i === index % n
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => pick(i)}
                  aria-label={scene.name}
                  aria-pressed={active}
                  title={scene.name}
                  className="relative h-18.75 w-15 cursor-pointer overflow-hidden rounded-lg shadow-[0_1px_2px_rgba(17,17,16,0.08)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <Image
                    src={scene.thumbnail}
                    alt=""
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                  {active && (
                    <span className="absolute inset-0 rounded-lg shadow-[inset_0_0_0_3px_var(--foreground),inset_0_0_0_5px_var(--background)]" />
                  )}
                </button>
              )
            })}
            {data.more > 0 && (
              <Link
                href={data.moreHref}
                className="grid h-18.75 w-15 place-items-center rounded-lg border border-dashed border-border text-center text-xs leading-tight font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <span className="flex flex-col whitespace-nowrap">
                  <span className="text-[15px] text-foreground">
                    +{data.more}
                  </span>
                  <span>more</span>
                </span>
              </Link>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href={main.href}>
                {data.cta}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Free
                </span>
              </Link>
            </Button>
            {data.secondary && (
              <Button asChild variant="outline" size="lg">
                <Link href={data.secondary.href}>{data.secondary.label}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* The stage: three dealt cards, the sample person and the arrow between them */}
        <div className="@container relative aspect-600/620 w-full max-w-150 justify-self-center">
          {[
            { scene: backLeft, at: BACK_LEFT, z: "z-[2]" },
            { scene: backRight, at: BACK_RIGHT, z: "z-[1]" },
          ].map(({ scene, at, z }) => (
            <div
              key={at.cx}
              aria-hidden
              className={cn(
                "absolute aspect-4/5 overflow-hidden rounded-[14px] shadow-[0_24px_50px_-30px_rgba(40,24,10,0.45),0_2px_6px_rgba(40,24,10,0.06)]",
                z,
              )}
              style={cardStyle(at)}
            >
              <Image
                src={scene.thumbnail}
                alt=""
                fill
                sizes="(min-width: 640px) 260px, 40vw"
                className="object-cover"
              />
            </div>
          ))}

          <div className="absolute z-5 aspect-4/5" style={cardStyle(MAIN)}>
            <div
              data-main
              className="absolute inset-0 overflow-hidden rounded-[14px] shadow-[0_40px_70px_-30px_rgba(40,24,10,0.5),0_4px_10px_rgba(40,24,10,0.08)]"
            >
              <Image
                src={main.thumbnail}
                alt={`${main.name} template, with a blank oval where their face goes`}
                fill
                sizes="(min-width: 640px) 320px, 55vw"
                className="object-cover"
              />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.75 text-[13px] font-medium text-[#111110]">
                <span className="size-1.5 rounded-full bg-brand" />
                {main.name}
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible"
          >
            <path
              data-arrow
              d={arrow}
              pathLength={1}
              fill="none"
              stroke="#fff"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1}
              opacity={0.9}
            />
            <path
              data-arrow
              d={arrow}
              pathLength={1}
              fill="none"
              stroke="var(--brand)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1}
            />
          </svg>

          <div
            data-avatar
            className="absolute z-30 aspect-square rounded-full border-4 border-white bg-muted shadow-[0_14px_28px_-14px_rgba(40,24,10,0.55),0_2px_6px_rgba(40,24,10,0.12)]"
            style={{
              left: `${(AVATAR.x / STAGE_W) * 100}%`,
              top: `${(AVATAR.y / STAGE_H) * 100}%`,
              width: `${(AVATAR.size / STAGE_W) * 100}%`,
              transform: "rotate(-4deg)",
            }}
          >
            <Image
              src="/templates/sample-person.webp"
              alt=""
              fill
              sizes="116px"
              className="rounded-full object-cover"
            />
            <span
              data-label
              className={cn(
                caveat.className,
                "absolute top-[14%] left-full ml-3.5 text-[clamp(20px,5cqw,30px)] leading-none font-bold tracking-normal whitespace-nowrap text-foreground",
              )}
              style={{ transform: "rotate(-4deg)" }}
            >
              {main.label}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
