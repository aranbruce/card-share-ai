"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { CalendarClock, Copy, ImageIcon, Sparkles } from "lucide-react"
import { StarMark } from "@/components/star-mark"
import { useAutoStep } from "@/hooks/use-auto-step"
import { cn } from "@/lib/utils"

/** How long each step plays before the next, in ms (the progress bar's duration too). */
const STEP_MS = 4200

const DEMO_STEPS = [
  {
    title: "Ask for a card",
    desc: "Say who it's for, the occasion and a detail or two",
  },
  {
    title: "It appears in the chat",
    desc: "With buttons to open it, invite people to sign and add your photo",
  },
  {
    title: "Schedule the send",
    desc: "It's emailed to them then; everyone signs before",
  },
]

const FIRST_ASK =
  "Make a birthday card for Sarah from the design team. She loves rock climbing, so make it Epic"
const SECOND_ASK = "Email it to sarah@example.com on Friday at 9am"

function UserMessage({ children }: { children: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-3.5 py-2.5 leading-normal">
        {children}
      </p>
    </div>
  )
}

function AssistantMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** The connector's tool call while the card is being made. */
function Working() {
  return (
    <>
      <p className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
        <StarMark className="size-3 text-brand" />
        Using CardShare.ai
      </p>
      <div className="mt-2.5 flex max-w-95 gap-3.5 rounded-xl border border-border bg-background p-3">
        <div className="slack-flow-sheen aspect-4/5 w-24 shrink-0 rounded-[3px_8px_8px_3px]" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <div className="h-3 w-[70%] rounded bg-secondary" />
          <div className="h-2.5 w-[45%] rounded bg-secondary" />
          <span className="mt-auto font-mono text-[11px] text-muted-foreground">
            Drawing the cover
          </span>
        </div>
      </div>
    </>
  )
}

/** The card as the connector shows it in the chat. */
function CardInChat() {
  const button =
    "inline-flex h-7.5 items-center gap-1.5 rounded-lg px-3 text-xs font-medium [&_svg]:size-3.5"
  return (
    <>
      <p className="leading-normal">
        Here&apos;s Sarah&apos;s card. Share the invite link so the team can
        sign it.
      </p>
      <div className="mt-2.5 flex max-w-95 gap-3.5 rounded-xl border border-border bg-background p-3">
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
          <span className="text-sm font-semibold">Happy Birthday, Sarah!</span>
          <span className="text-xs text-muted-foreground">
            From the design team
          </span>
          <div className="mt-auto flex flex-wrap gap-1.5">
            <span className={cn(button, "bg-brand text-white")}>Open card</span>
            <span className={cn(button, "border border-border bg-card")}>
              <Copy />
              Invite link
            </span>
            <span className={cn(button, "border border-border bg-card")}>
              <ImageIcon />
              Use my photo
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

function Scheduled() {
  return (
    <div className="flex max-w-95 items-start gap-2.5 rounded-xl border border-border bg-background p-3">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand" />
      <p className="leading-normal">
        Done. It&apos;ll be emailed to Sarah on{" "}
        <span className="font-medium">Fri 9 Oct, 9:00 am BST</span>. The team
        can sign until then.
      </p>
    </div>
  )
}

/** A chat with the assistant that plays one step of making a card. */
function ChatWindow({ assistant, step }: { assistant: string; step: number }) {
  return (
    <div
      aria-hidden
      className="flex h-130 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left text-sm shadow-[0_40px_80px_-40px_rgba(17,17,16,0.18),0_2px_6px_rgba(17,17,16,0.03)]"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="font-semibold">{assistant}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          CardShare.ai connected
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-4 overflow-hidden px-5 py-5">
        <UserMessage>{FIRST_ASK}</UserMessage>
        <AssistantMessage>
          {step === 0 ? <Working /> : <CardInChat />}
        </AssistantMessage>
        {step === 2 ? (
          <>
            <UserMessage>{SECOND_ASK}</UserMessage>
            <AssistantMessage>
              <Scheduled />
            </AssistantMessage>
          </>
        ) : null}
      </div>
      <div className="mx-4 mb-4 flex h-11 items-center rounded-xl border border-border px-3.5 text-muted-foreground">
        Reply to {assistant}…
      </div>
    </div>
  )
}

/** The chat window with the steps under it, playing each in turn while on screen. */
export function AssistantChatDemo({
  assistant,
  className,
}: {
  assistant: string
  className?: string
}) {
  const { target, step, run, playing, autoplay, select } = useAutoStep(
    DEMO_STEPS.length,
    STEP_MS,
  )

  return (
    <div ref={target} className={className}>
      <ChatWindow assistant={assistant} step={step} />
      <ol className="mt-6 flex flex-col gap-1.5 md:grid md:grid-cols-3">
        {DEMO_STEPS.map((s, i) => {
          const active = i === step
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => select(i)}
                aria-pressed={active}
                data-active={active}
                className="group relative flex h-full w-full cursor-pointer gap-4 overflow-hidden rounded-[14px] border border-transparent px-4.5 py-4 text-left data-[active=true]:border-border data-[active=true]:bg-card"
              >
                <span className="mt-px shrink-0 font-mono text-sm text-muted-foreground/90 group-data-[active=true]:text-brand">
                  {String(i + 1).padStart(2, "0")}
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
                    key={`${run}-${playing}`}
                    className="step-progress absolute bottom-0 left-0 h-0.5 bg-brand"
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
    </div>
  )
}
