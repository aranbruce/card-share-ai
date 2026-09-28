"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Sparkles, X } from "lucide-react"
import { ClosedCardCover } from "@/components/card-book-3d/closed-card-cover"
import { SampleCard3D, type SampleNote } from "@/components/sample-card-3d"

const DEMO_STATES = {
  Warm: {
    base: {
      imageUrl: "/demo/card-warm.webp",
      message:
        "Celebrating Your Blossoming 30s with Love, Laughter, and Adventure!",
    },
    withPhoto: {
      imageUrl: "/demo/card-warm-with-photo.webp",
      message: "Blooming into 30: A Journey to Remember!",
    },
  },
  Playful: {
    base: {
      imageUrl: "/demo/card-playful.webp",
      message: "All Aboard the Fabulous 30s Express, Mira!",
    },
    withPhoto: {
      imageUrl: "/demo/card-playful-with-photo.webp",
      message: "All Aboard the Crazy Thirties Train, Mira!",
    },
  },
  Dry: {
    base: {
      imageUrl: "/demo/card-dry.webp",
      message:
        "Turning 30: A Stop on Life's Train Where You Collect More Plants",
    },
    withPhoto: {
      imageUrl: "/demo/card-dry-with-photo.webp",
      message: "Turning 30: Embrace the Art of Aging Gracefully",
    },
  },
  Sincere: {
    base: {
      imageUrl: "/demo/card-sincere.webp",
      message: "So glad you're on our team - today is all yours!",
    },
    withPhoto: {
      imageUrl: "/demo/card-sincere-with-photo.webp",
      message: "Blossoming into Your Best Decade Yet, Mira!",
    },
  },
} as const

/** Inside the demo card once it's made: the opening note and a few signatures. */
const DEMO_INSIDE_MESSAGE =
  "Mira, happy 30th! Here's to botanical sketches, long train rides and the best year yet. Love, the design team"
const DEMO_NOTES: SampleNote[] = [
  {
    message: "Happy birthday! Cake is on me",
    font: "caveat",
    color: "#b4452f",
  },
  {
    message: "30 looks great on you, Mira",
    font: "dancing-script",
    color: "#3f5aa8",
  },
  { message: "Have the best day! Sam x", font: "pacifico", color: "#2f7d5b" },
]

/** Cover hue of a birthday card, as on the create page. */
const BIRTHDAY_HUE = 18

type Phase = "idle" | "headline" | "cover" | "done"

/**
 * The homepage's "live preview": a browser window around a small copy of the create page's
 * details step (same form, same preview states), filled in for Mira. Generating plays the real
 * sequence (headline, then cover) with pre-made results, then hands over to the real 3D card.
 */
export function HomeDemoPanel() {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [demoKey, setDemoKey] = useState<keyof typeof DEMO_STATES>("Warm")
  const [phase, setPhase] = useState<Phase>("idle")
  const [photoAttached, setPhotoAttached] = useState(false)
  const [result, setResult] = useState<{ imageUrl: string; message: string }>()

  const isGenerating = phase === "headline" || phase === "cover"

  const scheduleTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      const idx = timeoutsRef.current.indexOf(id)
      if (idx !== -1) timeoutsRef.current.splice(idx, 1)
      fn()
    }, ms)
    timeoutsRef.current.push(id)
  }

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      for (const id of timeouts) {
        clearTimeout(id)
      }
      timeouts.length = 0
    }
  }, [])

  const handleGenerate = () => {
    if (isGenerating) return
    const variant = photoAttached
      ? DEMO_STATES[demoKey].withPhoto
      : DEMO_STATES[demoKey].base
    setPhase("headline")
    scheduleTimeout(() => setPhase("cover"), 1100)
    scheduleTimeout(() => {
      setResult({ imageUrl: variant.imageUrl, message: variant.message })
      setPhase("done")
    }, 2600)
  }

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_80px_-40px_rgba(17,17,16,0.18)] md:block">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="mx-auto w-full max-w-sm truncate rounded-md bg-background px-3 py-1 text-center font-mono text-[11px] text-muted-foreground">
          cardshare.ai/create
        </div>
        <div className="w-[46px]" aria-hidden />
      </div>

      <div className="grid min-h-[620px] grid-cols-[300px_1fr] lg:grid-cols-[360px_1fr]">
        {/* The create page's details form, filled in */}
        <aside className="flex flex-col border-r border-border bg-card px-7 py-6 text-left">
          <h2 className="text-[30px] leading-[1.05] font-semibold tracking-[-0.03em]">
            Tell us
            <br />
            <span className="text-muted-foreground">about who</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You can regenerate anything after this step
          </p>

          <div className="mt-6 flex flex-1 flex-col gap-4">
            <div>
              <label
                htmlFor="demo-recipient"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                To
              </label>
              <Input id="demo-recipient" value="Mira" readOnly variant="soft" />
            </div>
            <div>
              <label
                htmlFor="demo-sender"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                From
              </label>
              <Input
                id="demo-sender"
                value="The design team"
                readOnly
                variant="soft"
              />
            </div>
            <div>
              <label
                htmlFor="demo-context"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Context{" "}
                <span className="font-normal opacity-60">(optional)</span>
              </label>
              <Textarea
                id="demo-context"
                value="Turns 30 on Thursday. Loves botanical illustration and long train rides"
                readOnly
                variant="card"
                className="min-h-20"
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                Reference photo{" "}
                <span className="font-normal opacity-60">(optional)</span>
              </div>
              {photoAttached ? (
                <div className="relative w-fit overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/demo/mira.png"
                    alt="Example reference photo for card generation"
                    className="max-h-24 max-w-full"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove reference photo"
                    onClick={() => setPhotoAttached(false)}
                    disabled={isGenerating}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhotoAttached(true)}
                  disabled={isGenerating}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach a reference photo
                </button>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                Tone
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  Object.keys(DEMO_STATES) as Array<keyof typeof DEMO_STATES>
                ).map((c) => (
                  <ChipButton
                    key={c}
                    onClick={() => setDemoKey(c)}
                    disabled={isGenerating}
                    active={demoKey === c}
                  >
                    {c}
                  </ChipButton>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? "Generating…"
                  : phase === "done"
                    ? "Regenerate"
                    : "Generate card"}
              </Button>
            </div>
          </div>
        </aside>

        {/* The create page's live preview */}
        <div className="flex min-w-0 items-center justify-center bg-background px-8 py-8">
          <div className="w-full max-w-[564px] text-center">
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground/60 uppercase">
              Live preview
            </p>
            <div className="mx-auto mt-5 flex justify-center">
              {phase === "done" && result ? (
                <SampleCard3D
                  id={`demo-${result.imageUrl}`}
                  imageUrl={result.imageUrl}
                  headline={result.message}
                  recipientName="Mira"
                  message={DEMO_INSIDE_MESSAGE}
                  notes={DEMO_NOTES}
                  showPager={false}
                  frameClassName="aspect-square"
                />
              ) : (
                // Before the card exists: the same frame and closed pose as the 3D card, so it
                // takes over without moving.
                <div className="relative aspect-square w-full">
                  <ClosedCardCover
                    headline=""
                    recipientName="Mira"
                    coverBackground={`linear-gradient(135deg, oklch(0.9 0.08 ${BIRTHDAY_HUE}) 0%, oklch(0.76 0.13 ${BIRTHDAY_HUE - 15}) 100%)`}
                    shimmer={isGenerating}
                  >
                    <div
                      className={`flex h-[12cqh] w-[12cqh] items-center justify-center rounded-[3cqh] shadow-sm ${
                        isGenerating ? "animate-pulse" : ""
                      }`}
                      style={{ background: `oklch(0.68 0.14 ${BIRTHDAY_HUE})` }}
                    >
                      <Sparkles className="h-1/2 w-1/2 stroke-white" />
                    </div>
                    <p
                      className="mt-[3cqh] text-[3.6cqh] leading-relaxed font-medium"
                      style={{ color: `oklch(0.28 0.07 ${BIRTHDAY_HUE})` }}
                    >
                      {phase === "headline"
                        ? "Writing your headline…"
                        : phase === "cover"
                          ? "Designing your cover…"
                          : "Hit Generate to see Mira's card"}
                    </p>
                  </ClosedCardCover>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
