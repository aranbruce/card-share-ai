"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** How long each tab shows before the next, in ms (the progress bar's duration too). */
const TAB_MS = 5000

/** The sketch shown beside a step: notes on a page, an AI draft, or the finished card. */
export type FeatureSketch = "notes" | "draft" | "deliver"

export type FeatureTab = {
  n: string
  title: string
  desc: string
  sketch: FeatureSketch
}

/**
 * Advances the tabs while `target` is on screen, until a tab is picked (then it stays
 * there). Off for visitors who prefer reduced motion.
 */
function useFeatureTab(count: number) {
  const target = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState(0)
  const [auto, setAuto] = useState(true)
  const [motionOk, setMotionOk] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)")
    const update = () => setMotionOk(motion.matches)
    update()
    motion.addEventListener("change", update)
    return () => motion.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const el = target.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const autoplay = auto && motionOk
  const playing = autoplay && visible
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => setTab((t) => (t + 1) % count), TAB_MS)
    return () => clearTimeout(timer)
  }, [playing, tab, count])

  const pick = (i: number) => {
    setTab(i)
    setAuto(false)
  }

  return { target, tab, autoplay, playing, pick }
}

const NOTE_LINE = "h-2 rounded bg-[rgba(17,17,16,0.18)]"

/** Notes, a GIF and a selected note placed anywhere on a card page. */
function NotesSketch() {
  return (
    <div className="relative h-100 w-105 rounded-[14px] bg-card shadow-[0_40px_70px_-40px_rgba(17,17,16,0.4)]">
      <div className="absolute top-10 left-8.5 flex w-42 -rotate-5 flex-col gap-2 rounded-lg bg-[oklch(0.93_0.06_90)] p-4">
        <div className={cn(NOTE_LINE, "w-[90%]")} />
        <div className={cn(NOTE_LINE, "w-[70%]")} />
        <div className={cn(NOTE_LINE, "w-[45%]")} />
      </div>
      <div className="absolute top-16 left-56.5 flex h-29 w-40 rotate-4 items-end justify-end rounded-lg bg-[oklch(0.86_0.06_300)] p-2.5">
        <span className="rounded-[5px] bg-foreground px-1.75 py-0.75 font-mono text-[11px] font-medium text-background">
          GIF
        </span>
      </div>
      <div className="absolute top-56.5 left-24 flex w-52.5 rotate-2 flex-col gap-2 rounded-lg bg-[oklch(0.92_0.05_160)] p-4 outline-2 outline-offset-6 outline-brand outline-dashed">
        <div className={cn(NOTE_LINE, "w-[85%]")} />
        <div className={cn(NOTE_LINE, "w-[60%]")} />
      </div>
      <div className="absolute top-72.5 left-76.5 size-4 rounded-sm border-2 border-brand bg-card" />
    </div>
  )
}

/** A drafted cover and a highlighted line being regenerated. */
function DraftSketch() {
  return (
    <div className="relative flex w-85 flex-col gap-3.5 rounded-[14px] bg-card p-4 shadow-[0_40px_70px_-40px_rgba(17,17,16,0.4)]">
      <div className="flex h-57.5 items-center justify-center rounded-lg bg-[repeating-linear-gradient(135deg,oklch(0.93_0.03_30)_0_10px,oklch(0.96_0.02_30)_10px_20px)] font-mono text-xs text-muted-foreground">
        cover
      </div>
      <div className="flex items-center gap-3 rounded-lg border-2 border-brand px-3.5 py-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-2 w-[95%] rounded bg-[rgba(17,17,16,0.2)]" />
          <div className="h-2 w-[60%] rounded bg-[rgba(17,17,16,0.2)]" />
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand"
        >
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
      <span className="absolute -right-12 bottom-7.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background shadow-[0_12px_24px_-12px_rgba(17,17,16,0.5)]">
        Regenerate
      </span>
    </div>
  )
}

const DELIVER_COLORS = [
  "bg-[oklch(0.93_0.06_90)]",
  "bg-[oklch(0.86_0.06_300)]",
  "bg-[oklch(0.92_0.05_160)]",
  "bg-[oklch(0.93_0.04_30)]",
]

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={cn("absolute text-brand", className)}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

/** Notes from around the page gathered into one finished card. */
function DeliverSketch() {
  return (
    <div className="relative h-110 w-150">
      <div
        className={cn(
          "absolute top-22.5 left-7.5 h-17.5 w-25 -rotate-8 rounded-lg",
          DELIVER_COLORS[0],
        )}
      />
      <div
        className={cn(
          "absolute top-62.5 left-5 h-16 w-22.5 rotate-6 rounded-lg",
          DELIVER_COLORS[1],
        )}
      />
      <div
        className={cn(
          "absolute top-27.5 right-7.5 h-16.5 w-23.5 rotate-7 rounded-lg",
          DELIVER_COLORS[2],
        )}
      />
      <div
        className={cn(
          "absolute top-67.5 right-9 h-16 w-24 -rotate-5 rounded-lg",
          DELIVER_COLORS[3],
        )}
      />
      <div className="absolute top-10 left-47.5 h-72.5 w-55 -rotate-4 rounded-xl bg-card shadow-[0_14px_30px_-20px_rgba(17,17,16,0.3)]" />
      <div className="absolute top-10 left-47.5 grid h-72.5 w-55 grid-cols-2 content-start gap-2.5 rounded-xl bg-card p-4 shadow-[0_40px_70px_-40px_rgba(17,17,16,0.45)]">
        {DELIVER_COLORS.map((color) => (
          <div key={color} className={cn("h-16 rounded-md", color)} />
        ))}
        <div className="col-span-2 mt-2.5 h-2 w-[70%] rounded bg-[rgba(17,17,16,0.15)]" />
      </div>
      <Arrow className="top-42.5 left-35" />
      <Arrow className="top-47.5 right-35 -scale-x-100" />
    </div>
  )
}

const SKETCHES: Record<FeatureSketch, () => ReactNode> = {
  notes: NotesSketch,
  draft: DraftSketch,
  deliver: DeliverSketch,
}

/**
 * A section heading with its steps as tabs: they advance on their own (with a progress
 * bar) until one is picked, and a sketch beside them shows the active step. Below `lg`
 * the sketch sits between the heading and the tabs.
 */
export function FeatureTabs({
  eyebrow,
  title,
  description,
  tabs,
  id,
}: {
  eyebrow: string
  title: string
  description?: string
  tabs: FeatureTab[]
  id?: string
}) {
  const { target, tab, autoplay, playing, pick } = useFeatureTab(tabs.length)
  const Sketch = SKETCHES[tabs[tab].sketch]

  return (
    <section id={id} className="border-t border-border">
      <div
        ref={target}
        className="mx-auto grid max-w-360 grid-cols-1 gap-10 px-6 py-20 md:px-15 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-12 lg:gap-y-0 xl:grid-cols-[520px_minmax(0,1fr)] xl:gap-x-18"
      >
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] text-pretty md:text-4xl xl:text-[44px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {/* The sketches are drawn at full size and zoomed down to fit narrower panels */}
        <div
          aria-hidden
          className="flex h-72 items-center justify-center overflow-hidden rounded-3xl bg-secondary sm:h-100 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:h-120 xl:h-140"
        >
          <div className="max-sm:zoom-[0.5] sm:max-lg:zoom-[0.8] lg:max-xl:zoom-[0.65] xl:max-[1440px]:zoom-[0.9]">
            <Sketch />
          </div>
        </div>

        <ol className="flex flex-col gap-1.5 lg:col-start-1 lg:row-start-3 lg:mt-10">
          {tabs.map((t, i) => {
            const active = i === tab
            return (
              <li
                key={t.n}
                data-active={active}
                className="group relative overflow-hidden rounded-[14px] px-5.5 py-5 transition-[background-color,box-shadow] duration-250 data-[active=true]:bg-card data-[active=true]:shadow-[0_20px_40px_-28px_rgba(17,17,16,0.35),0_0_0_1px_var(--border)]"
              >
                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">
                  {/* The button's ::after covers the whole tab, so all of it is clickable */}
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-expanded={active}
                    className="flex cursor-pointer items-baseline gap-3.5 text-left after:absolute after:inset-0 after:rounded-[14px]"
                  >
                    <span className="font-mono text-[13px] font-normal text-brand">
                      {t.n}
                    </span>
                    {t.title}
                  </button>
                </h3>
                {/* Always in the page (for search), opened when the tab is active */}
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-250 group-data-[active=true]:grid-rows-[1fr]">
                  <p
                    className={cn(
                      "overflow-hidden pl-8.25 text-[15px] leading-relaxed text-muted-foreground",
                      !active && "invisible",
                    )}
                  >
                    <span className="block pt-2">{t.desc}</span>
                  </p>
                </div>
                {active && autoplay ? (
                  <span
                    key={`${tab}-${playing}`}
                    className="step-progress absolute bottom-0 left-0 h-0.5 bg-brand"
                    style={{
                      animationDuration: `${TAB_MS}ms`,
                      animationPlayState: playing ? "running" : "paused",
                    }}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
