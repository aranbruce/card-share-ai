"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { StarMark } from "@/components/star-mark"
import { SLACK_FLOW_STEPS } from "@/lib/slack-flow-steps"
import { cn } from "@/lib/utils"

/** How long each step plays before the next, in ms (the progress bar's duration too). */
const STEP_MS = 3600

type Step = 0 | 1 | 2

/**
 * Cycles the steps while `target` is on screen, unless the visitor prefers reduced
 * motion (then it stays on the first step and only changes when a step is picked).
 * `run` changes on every (re)start, so the progress bar can restart with it.
 */
function useSlackFlowStep() {
  const target = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>(0)
  const [run, setRun] = useState(0)
  const [visible, setVisible] = useState(false)
  const [autoplay, setAutoplay] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)")
    const update = () => setAutoplay(motion.matches)
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

  const playing = autoplay && visible
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      setStep((s) => ((s + 1) % 3) as Step)
      setRun((r) => r + 1)
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [playing, run])

  const select = (i: Step) => {
    setStep(i)
    setRun((r) => r + 1)
  }

  return { target, step, run, playing, autoplay, select }
}

/** Sample people in the mockup, with the site's stock portraits. */
const TOM_AVATAR = "/avatars/person-2.webp"
const RACHEL_AVATAR = "/avatars/person-1.webp"
const SIGNER_AVATARS = [
  RACHEL_AVATAR,
  "/avatars/person-4.webp",
  "/avatars/person-5.webp",
]

function PhotoAvatar({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={34}
      height={34}
      className="size-8.5 shrink-0 rounded-lg object-cover"
    />
  )
}

function AppAvatar() {
  return (
    <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
      <StarMark className="size-4" />
    </div>
  )
}

function Author({
  name,
  time,
  app,
}: {
  name: string
  time: string
  app?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-semibold">{name}</span>
      {app ? (
        <span className="rounded bg-secondary px-1 py-px text-[10px] font-medium text-muted-foreground">
          APP
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  )
}

const TONES = ["Heartfelt", "Roast", "Dad jokes", "Hype"]

/** The /cardshareai form, open over the channel. */
function CreateCardModal() {
  const field = "rounded-lg border border-border text-[13px]"
  const label = "text-xs font-medium text-muted-foreground"
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(17,17,16,0.18)]">
      <div className="w-95 max-w-[calc(100%-24px)] overflow-hidden rounded-[14px] bg-card shadow-[0_30px_60px_-20px_rgba(17,17,16,0.35)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4.5 py-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/icon.svg" alt="" className="size-5" />
          <span className="text-[15px] font-semibold">Create a card</span>
        </div>
        <div className="flex flex-col gap-3 px-4.5 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.25">
              <span className={label}>Card type</span>
              <div
                className={cn(
                  field,
                  "flex h-9 items-center justify-between px-2.5",
                )}
              >
                Birthday
                <ChevronDown className="size-3 text-muted-foreground" />
              </div>
            </div>
            <div className="flex flex-col gap-1.25">
              <span className={label}>Recipient</span>
              <div className={cn(field, "flex h-9 items-center px-2.5")}>
                Emily
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.25">
            <span className={label}>Tone</span>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((tone, i) => (
                <span
                  key={tone}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    i === 0
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground",
                  )}
                >
                  {tone}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.25">
            <span className={label}>Context</span>
            <div className={cn(field, "px-2.5 py-2 leading-[1.45]")}>
              Loves bouldering and terrible puns
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4.5 py-3">
          <span className="inline-flex h-8 items-center rounded-lg border border-border px-3.5 text-[13px] font-medium">
            Cancel
          </span>
          <span className="inline-flex h-8 items-center rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white">
            Create
          </span>
        </div>
      </div>
    </div>
  )
}

/** The app's reply while the card is being made: a shimmering placeholder card. */
function GeneratingReply() {
  return (
    <>
      <p className="mt-0.5 text-muted-foreground">
        Creating a card for{" "}
        <span className="font-medium text-foreground">Emily</span>…
      </p>
      <div className="mt-2 flex max-w-105 gap-3.5 rounded-[10px] border border-border bg-background p-3">
        <div className="slack-flow-sheen aspect-4/5 w-24 shrink-0 rounded-[3px_8px_8px_3px]" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <div className="h-3 w-[70%] rounded bg-secondary" />
          <div className="h-2.5 w-[45%] rounded bg-secondary" />
          <span className="mt-auto font-mono text-[11px] text-muted-foreground">
            Designing the cover
          </span>
        </div>
      </div>
    </>
  )
}

/** The finished card in the channel, with the team signing it. */
function ReadyReply() {
  return (
    <>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-medium text-foreground">@Tom</span> Your card for
        Emily is ready!
      </p>
      <div className="mt-2 flex max-w-105 gap-3.5 rounded-[10px] border border-border bg-background p-3">
        <div className="relative aspect-4/5 w-24 shrink-0 overflow-hidden rounded-[3px_8px_8px_3px] shadow-[0_10px_20px_-12px_rgba(40,24,10,0.5)]">
          <Image
            src="/occasions/birthday.webp"
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.75 pt-0.5">
          <span className="text-sm font-semibold">Happy Birthday, Emily!</span>
          <span className="text-xs text-muted-foreground">cardshare.ai</span>
          <div className="mt-auto flex flex-wrap gap-2">
            <span className="inline-flex h-7.5 items-center rounded-lg bg-brand px-3 text-xs font-medium text-white">
              Sign the card
            </span>
            <span className="inline-flex h-7.5 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium">
              Open
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex">
          {SIGNER_AVATARS.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={20}
              height={20}
              className={cn(
                "size-5 rounded-md border-2 border-card object-cover",
                i > 0 && "-ml-1.5",
              )}
            />
          ))}
        </div>
        Rachel, Jon and 4 others signed
      </div>
    </>
  )
}

/** A Slack workspace window that plays one step of the /cardshareai flow. */
function SlackFlowWindow({
  step,
  className,
}: {
  step: Step
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid h-140 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_40px_80px_-40px_rgba(17,17,16,0.18),0_2px_6px_rgba(17,17,16,0.03)] sm:grid-cols-[188px_minmax(0,1fr)]",
        className,
      )}
    >
      <aside className="hidden flex-col gap-0.5 border-r border-border bg-secondary px-3 py-4.5 text-[13px] text-muted-foreground sm:flex">
        <div className="flex gap-1.5 px-2 pb-4">
          <div className="size-2.5 rounded-full bg-border" />
          <div className="size-2.5 rounded-full bg-border" />
          <div className="size-2.5 rounded-full bg-border" />
        </div>
        <span className="px-2 pb-2 font-semibold text-foreground">
          Acme Ltd
        </span>
        <span className="px-2 py-1.25"># general</span>
        <span className="rounded-md bg-card px-2 py-1.25 font-medium text-foreground shadow-[0_1px_2px_rgba(17,17,16,0.05)]">
          # design-team
        </span>
        <span className="px-2 py-1.25"># random</span>
        <span className="px-2 pt-4 pb-1.25 font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
          Apps
        </span>
        <span className="flex items-center gap-2 px-2 py-1.25">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/icon.svg" alt="" className="size-4" />
          CardShare.ai
        </span>
      </aside>

      <div className="relative flex min-w-0 flex-col">
        <div className="border-b border-border px-5.5 py-4 text-sm font-semibold">
          # design-team
        </div>
        <div className="flex flex-1 flex-col justify-end gap-1 overflow-hidden px-3.5 py-4.5 text-sm">
          <div className="flex gap-3 px-2 py-1.5">
            <PhotoAvatar src={RACHEL_AVATAR} />
            <div>
              <Author name="Rachel" time="10:38 AM" />
              <p className="mt-0.5 leading-normal">
                Emily&apos;s birthday is Thursday. Is anyone sorting a card?
              </p>
            </div>
          </div>
          {step > 0 ? (
            <>
              <div className="flex gap-3 px-2 py-1.5">
                <PhotoAvatar src={TOM_AVATAR} />
                <div>
                  <Author name="Tom" time="10:42 AM" />
                  <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">
                    /cardshareai
                  </p>
                </div>
              </div>
              <div className="flex gap-3 px-2 py-1.5">
                <AppAvatar />
                <div className="min-w-0 flex-1">
                  <Author name="CardShare.ai" time="10:42 AM" app />
                  {step === 1 ? <GeneratingReply /> : <ReadyReply />}
                </div>
              </div>
            </>
          ) : null}
        </div>
        <div className="mx-4 mb-4 flex h-11 items-center rounded-[10px] border border-border px-3.5 text-sm text-muted-foreground">
          {step === 0 ? (
            <>
              <span className="font-mono text-[13px] text-foreground">
                /cardshareai
              </span>
              <span className="slack-flow-caret ml-0.5 h-4 w-px bg-foreground" />
            </>
          ) : (
            "Message #design-team"
          )}
        </div>
        {step === 0 ? <CreateCardModal /> : null}
      </div>
    </div>
  )
}

/** The steps as buttons: the active one is raised, with a bar for its time left. */
function SlackFlowSteps({
  flow,
  className,
}: {
  flow: Omit<ReturnType<typeof useSlackFlowStep>, "target">
  className?: string
}) {
  const { step, run, playing, autoplay, select } = flow
  return (
    <ol className={cn("flex flex-col gap-1.5", className)}>
      {SLACK_FLOW_STEPS.map((s, i) => {
        const active = i === step
        return (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => select(i as Step)}
              aria-pressed={active}
              data-active={active}
              className="group relative flex w-full cursor-pointer gap-4 overflow-hidden rounded-[14px] border border-transparent px-4.5 py-4 text-left data-[active=true]:border-border data-[active=true]:bg-card"
            >
              <span className="mt-px shrink-0 font-mono text-sm text-muted-foreground/90 group-data-[active=true]:text-brand">
                {s.n}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-semibold tracking-[-0.015em]">
                  {s.title}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </span>
              </span>
              {active && autoplay ? (
                <span
                  key={run}
                  className="slack-flow-progress absolute bottom-0 left-0 h-0.5 bg-brand"
                  style={{
                    animationDuration: `${STEP_MS}ms`,
                    animationPlayState: playing ? "running" : "paused",
                  }}
                />
              ) : null}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The homepage's Slack section body: the steps (which play the window in turn, or
 * jump to a step on click) between the `intro` and `footer`, beside the window from
 * `lg`. Below that the window sits between the intro and the steps, so the step
 * it's playing stays in view.
 */
export function SlackFlowSection({
  intro,
  footer,
}: {
  intro: ReactNode
  footer: ReactNode
}) {
  const { target, ...flow } = useSlackFlowStep()

  return (
    <div
      ref={target}
      className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[480px_minmax(0,1fr)] lg:gap-20"
    >
      <div>
        {intro}
        <SlackFlowWindow step={flow.step} className="mt-10 lg:hidden" />
        <SlackFlowSteps flow={flow} className="mt-8" />
        {footer}
      </div>

      <SlackFlowWindow step={flow.step} className="hidden lg:grid" />
    </div>
  )
}

/**
 * The window with the steps under it (side by side from `md`), for pages without
 * room beside the copy (the Slack install page).
 */
export function SlackFlowStack({ className }: { className?: string }) {
  const { target, ...flow } = useSlackFlowStep()

  return (
    <div ref={target} className={className}>
      <SlackFlowWindow step={flow.step} />
      <SlackFlowSteps flow={flow} className="mt-6 md:grid md:grid-cols-3" />
    </div>
  )
}
