"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react"
import { CardThumb3D } from "@/components/dashboard/card-thumb-3d"
import { MessageFontVariables } from "@/components/message-font-variables"
import { getMessageFontFamily } from "@/lib/message-font-presets"
import { sampleAvatarsFor } from "@/lib/sample-avatars"
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

/** The sample card the sketches are drawn from: an occasion's cover, title and notes. */
export type FeatureSample = {
  /** Seeds the signers' faces, so they're the same on every render. */
  id: string
  headline: string
  coverImage: string | null
  coverHue: number
  message: string
  notes: { message: string; font: string; color: string }[]
}

const SKETCH_SHADOW = "shadow-[0_40px_70px_-40px_rgba(17,17,16,0.4)]"

/** A card cover as the site draws it: the art, a dark fade, and the title in white. */
function Cover({
  sample,
  sizes,
  className,
}: {
  sample: FeatureSample
  sizes: string
  className?: string
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={
        sample.coverImage
          ? undefined
          : {
              background: `linear-gradient(135deg, oklch(0.9 0.08 ${sample.coverHue}) 0%, oklch(0.78 0.13 ${sample.coverHue - 15}) 100%)`,
            }
      }
    >
      {sample.coverImage ? (
        <Image
          src={sample.coverImage}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" />
      <p className="absolute inset-x-4 bottom-4 text-center text-xl leading-tight font-semibold tracking-[-0.02em] text-balance text-white">
        {sample.headline}
      </p>
    </div>
  )
}

/** A signed note: the signer's face and their message in their own ink and hand. */
function Note({
  note,
  avatar,
  className,
}: {
  note: FeatureSample["notes"][number]
  avatar: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)]",
        className,
      )}
    >
      <Image
        src={avatar}
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0 rounded-full object-cover"
      />
      <p
        className="text-lg leading-tight"
        style={{
          color: note.color,
          fontFamily: getMessageFontFamily(note.font),
        }}
      >
        {note.message}
      </p>
    </div>
  )
}

/** Notes placed anywhere on the card's page, a GIF among them, one picked up to move. */
function NotesSketch({ sample }: { sample: FeatureSample }) {
  const avatars = sampleAvatarsFor(sample.id, 3)
  const [first, second, third] = sample.notes
  return (
    <div
      className={cn(
        "relative h-100 w-105 rounded-[14px] bg-card bg-[radial-gradient(oklch(0.9_0.006_83)_1px,transparent_1px)] bg-size-[20px_20px]",
        SKETCH_SHADOW,
      )}
    >
      {first ? (
        <Note
          note={first}
          avatar={avatars[0]}
          className="absolute top-9 left-7 w-50 -rotate-4"
        />
      ) : null}
      <div className="absolute top-14 right-7 h-28 w-36 rotate-4 overflow-hidden rounded-xl shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)]">
        <Cover
          sample={{ ...sample, headline: "" }}
          sizes="144px"
          className="size-full"
        />
        <span className="absolute right-2 bottom-2 rounded-[5px] bg-foreground px-1.75 py-0.75 font-mono text-[11px] font-medium text-background">
          GIF
        </span>
      </div>
      {second ? (
        <div className="absolute top-55 left-20 rotate-2 outline-2 outline-offset-6 outline-brand outline-dashed">
          <Note note={second} avatar={avatars[1]} className="w-56" />
          <span className="absolute -right-3.5 -bottom-3.5 size-4 rounded-sm border-2 border-brand bg-card" />
        </div>
      ) : null}
      {third ? (
        <Note
          note={third}
          avatar={avatars[2]}
          className="absolute right-6 bottom-6 w-40 -rotate-3"
        />
      ) : null}
    </div>
  )
}

/** The drafted cover and opening note, with the note being regenerated. */
function DraftSketch({ sample }: { sample: FeatureSample }) {
  return (
    <div
      className={cn(
        "relative flex w-85 flex-col gap-3.5 rounded-[14px] bg-card p-4",
        SKETCH_SHADOW,
      )}
    >
      <Cover
        sample={sample}
        sizes="308px"
        className="aspect-4/3 rounded-[4px_10px_10px_4px]"
      />
      <div className="flex items-start gap-3 rounded-lg border-2 border-brand px-3.5 py-3">
        <p className="line-clamp-3 flex-1 text-sm leading-snug text-foreground">
          {sample.message}
        </p>
        <RefreshCw
          className="mt-0.5 size-4.5 shrink-0 text-brand"
          strokeWidth={2.5}
        />
      </div>
      <span className="absolute -right-12 bottom-9 flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background shadow-[0_12px_24px_-12px_rgba(17,17,16,0.5)]">
        <Sparkles className="size-3.5" />
        Regenerate
      </span>
    </div>
  )
}

/** Everyone's notes coming together into the one finished card. */
function DeliverSketch({ sample }: { sample: FeatureSample }) {
  const avatars = sampleAvatarsFor(sample.id, 4)
  return (
    <div className="relative h-110 w-150">
      <div className="absolute top-1/2 left-1/2 h-90 w-60 -translate-1/2">
        <CardThumb3D
          imageUrl={sample.coverImage}
          headline={sample.headline}
          alt=""
          hue={sample.coverHue}
          cardHeight={92}
          cardOffsetY={0}
        />
      </div>
      {avatars.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={44}
          height={44}
          className={cn(
            "absolute size-11 rounded-full object-cover shadow-[0_18px_36px_-18px_rgba(20,14,6,0.4)] ring-4 ring-card",
            DELIVER_AVATAR_SPOTS[i],
          )}
        />
      ))}
      <Arrow className="top-34 left-34 rotate-20" />
      <Arrow className="top-66 left-34 -rotate-20" />
      <Arrow className="top-34 right-34 rotate-160" />
      <Arrow className="top-66 right-34 -rotate-160" />
      <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)]">
        <Check className="size-3.5 text-brand" strokeWidth={3} />
        {sample.notes.length + 9} notes, one card
      </span>
    </div>
  )
}

/** Where the signers sit around the finished card, top left, bottom left, top right, bottom right. */
const DELIVER_AVATAR_SPOTS = [
  "top-22 left-14",
  "top-74 left-10",
  "top-24 right-12",
  "top-72 right-14",
]

function Arrow({ className }: { className?: string }) {
  return (
    <ArrowRight
      className={cn("absolute size-7 text-brand", className)}
      strokeWidth={2}
    />
  )
}

const SKETCHES: Record<
  FeatureSketch,
  (props: { sample: FeatureSample }) => ReactNode
> = {
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
  sample,
  id,
}: {
  eyebrow: string
  title: string
  description?: string
  tabs: FeatureTab[]
  sample: FeatureSample
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
          <MessageFontVariables className="max-sm:zoom-[0.5] sm:max-lg:zoom-[0.8] lg:max-xl:zoom-[0.65] xl:max-[1440px]:zoom-[0.9]">
            <Sketch sample={sample} />
          </MessageFontVariables>
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
