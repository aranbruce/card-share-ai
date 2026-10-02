import Image from "next/image"
import Link from "next/link"
import { StarMark } from "@/components/star-mark"
import { SLACK_FLOW_STEPS } from "@/lib/slack-flow-steps"
import { cn } from "@/lib/utils"

export type SlackStoryboardCard = {
  /** The card type picked in the form, e.g. "Birthday". */
  occasion: string
  recipient: string
  title: string
  coverImage: string | null
  /** Hue of the plain cover when there's no image. */
  coverHue: number
}

const FRAME =
  "relative h-85 overflow-hidden rounded-2xl border border-border shadow-[0_30px_60px_-40px_rgba(17,17,16,0.16)]"

function Cover({
  card,
  sizes,
  className,
}: {
  card: SlackStoryboardCard
  sizes: string
  className?: string
}) {
  return (
    <div
      className={cn("relative aspect-4/5 shrink-0 overflow-hidden", className)}
      style={
        card.coverImage
          ? undefined
          : {
              background: `linear-gradient(135deg, oklch(0.9 0.08 ${card.coverHue}) 0%, oklch(0.78 0.13 ${card.coverHue - 15}) 100%)`,
            }
      }
    >
      {card.coverImage ? (
        <Image
          src={card.coverImage}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : null}
    </div>
  )
}

/** Frame 1: the /cardshareai form, filled in, over the composer. */
function FormFrame({ card }: { card: SlackStoryboardCard }) {
  const field =
    "flex h-8 min-w-0 items-center rounded-[7px] border border-border px-2.5 text-xs"
  return (
    <div className={cn(FRAME, "bg-card")}>
      <div className="absolute inset-x-6 top-6 overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_40px_-20px_rgba(17,17,16,0.25)]">
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[13px] font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/icon.svg" alt="" className="size-4" />
          Create a card
        </div>
        <div className="flex flex-col gap-2.25 px-3.5 py-3">
          <div className="grid grid-cols-2 gap-2">
            <div className={field}>
              <span className="truncate">{card.occasion}</span>
            </div>
            <div className={field}>
              <span className="truncate">{card.recipient}</span>
            </div>
          </div>
          <div className="flex gap-1.25">
            {["Heartfelt", "Roast", "Epic"].map((tone, i) => (
              <span
                key={tone}
                className={cn(
                  "rounded-full px-2.25 py-0.75 text-[11px] font-medium",
                  i === 0
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground",
                )}
              >
                {tone}
              </span>
            ))}
          </div>
          <div className="flex justify-end">
            <span className="inline-flex h-7 items-center rounded-[7px] bg-brand px-3 text-xs font-medium text-white">
              Create
            </span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-6 bottom-6 flex h-10.5 items-center rounded-[10px] border border-border bg-background px-3.5">
        <span className="font-mono text-[13px]">/cardshareai</span>
        <span className="slack-flow-caret ml-0.5 h-4 w-px bg-foreground" />
      </div>
    </div>
  )
}

/** Frame 2: the cover and headline being made. */
function GeneratingFrame({ card }: { card: SlackStoryboardCard }) {
  return (
    <div
      className={cn(
        FRAME,
        "flex items-center justify-center gap-5 bg-secondary px-6",
      )}
    >
      <div className="relative w-[48%] max-w-42 -rotate-3 overflow-hidden rounded-[4px_12px_12px_4px] shadow-[0_30px_50px_-26px_rgba(40,24,10,0.55)]">
        <Cover card={card} sizes="168px" />
        <div className="slack-story-sheen absolute inset-0" />
      </div>
      <div className="flex w-[40%] max-w-37.5 flex-col gap-2.5">
        <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          Headline
        </span>
        <span className="text-lg leading-[1.15] font-semibold tracking-[-0.02em]">
          {card.title}
        </span>
        <span className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          Cover
        </span>
        <div className="h-1 overflow-hidden rounded-xs bg-border">
          <div className="h-full w-[72%] bg-brand" />
        </div>
      </div>
    </div>
  )
}

/** Stock portraits for the people who've signed. */
const SIGNER_AVATARS = [
  "/avatars/person-1.webp",
  "/avatars/person-4.webp",
  "/avatars/person-5.webp",
]

/** Frame 3: the finished card in the channel. */
function ReadyFrame({ card }: { card: SlackStoryboardCard }) {
  return (
    <div
      className={cn(FRAME, "flex flex-col justify-end bg-card p-5 text-[13px]")}
    >
      <span className="absolute top-4.5 left-5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        # design-team
      </span>
      <div className="flex gap-2.5">
        <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <StarMark className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold">CardShare.ai</span>
            <span className="rounded bg-secondary px-1 py-px text-[9px] font-medium text-muted-foreground">
              APP
            </span>
          </div>
          <p className="mt-0.5 text-muted-foreground">
            <span className="font-medium text-foreground">@Tom</span> Your card
            for {card.recipient} is ready!
          </p>
          <div className="mt-2 flex gap-3 rounded-[10px] border border-border bg-background p-2.5">
            <Cover
              card={card}
              sizes="80px"
              className="w-20 rounded-[3px_7px_7px_3px]"
            />
            <div className="flex min-w-0 flex-col gap-0.75">
              <span className="font-semibold">{card.title}</span>
              <span className="text-[11px] text-muted-foreground">
                cardshare.ai
              </span>
              <span className="mt-auto inline-flex h-6.5 items-center self-start rounded-[7px] bg-brand px-2.5 text-[11px] font-medium text-white">
                Sign the card
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="flex">
              {SIGNER_AVATARS.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={18}
                  height={18}
                  className={cn(
                    "size-4.5 rounded-[5px] border-2 border-card object-cover",
                    i > 0 && "-ml-1.5",
                  )}
                />
              ))}
            </div>
            6 signed
          </div>
        </div>
      </div>
    </div>
  )
}

const FRAMES = [FormFrame, GeneratingFrame, ReadyFrame]

/**
 * "Works with Slack", told as a storyboard: one still frame per step of the
 * /cardshareai flow, for the given card, with the step under each frame.
 */
export function SlackStoryboard({ card }: { card: SlackStoryboardCard }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end md:gap-10">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              Works with Slack
            </p>
            <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
              Create cards without leaving Slack
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Install the CardShare.ai bot and send a personalized card in
              seconds, directly from any channel or DM
            </p>
          </div>
          <Link href="/slack/install" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Add to Slack"
              height="40"
              width="139"
              src="https://platform.slack-edge.com/img/add_to_slack.png"
              srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
            />
          </Link>
        </div>
        <ol className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-4 lg:gap-8">
          {SLACK_FLOW_STEPS.map((s, i) => {
            const Frame = FRAMES[i]
            return (
              <li key={s.n} className="flex flex-col gap-6">
                {/* Below lg the columns are narrow, so each frame keeps its full-size
                    layout and is zoomed down to fit */}
                <div
                  aria-hidden
                  className="sm:zoom-[0.55] md:zoom-[0.65] lg:zoom-[1]"
                >
                  <Frame card={card} />
                </div>
                <div className="flex gap-4">
                  <span className="mt-px font-mono text-sm text-brand">
                    {s.n}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[17px] font-semibold tracking-[-0.015em]">
                      {s.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
