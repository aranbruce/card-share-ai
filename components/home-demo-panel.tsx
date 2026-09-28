"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Paperclip, Sparkles, X } from "lucide-react"
import { ClosedCardCover } from "@/components/card-book-3d/closed-card-cover"
import { cardBookFrameClass } from "@/components/card-book-3d/frame"
import { SampleCard3D, type SampleNote } from "@/components/sample-card-3d"

const DEMO_STATES = {
  Warm: {
    base: {
      imageUrl: "/demo/card-warm.png",
      message:
        "Celebrating Your Blossoming 30s with Love, Laughter, and Adventure!",
    },
    withPhoto: {
      imageUrl: "/demo/card-warm-with-photo.png",
      message: "Blooming into 30: A Journey to Remember!",
    },
  },
  Playful: {
    base: {
      imageUrl: "/demo/card-playful.png",
      message: "All Aboard the Fabulous 30s Express, Mira!",
    },
    withPhoto: {
      imageUrl: "/demo/card-playful-with-photo.png",
      message: "All Aboard the Crazy Thirties Train, Mira!",
    },
  },
  Dry: {
    base: {
      imageUrl: "/demo/card-dry.png",
      message:
        "Turning 30: A Stop on Life's Train Where You Collect More Plants",
    },
    withPhoto: {
      imageUrl: "/demo/card-dry-with-photo.png",
      message: "Turning 30: Embrace the Art of Aging Gracefully",
    },
  },
  Sincere: {
    base: {
      imageUrl: "/demo/card-sincere.png",
      message: "So glad you're on our team - today is all yours!",
    },
    withPhoto: {
      imageUrl: "/demo/card-sincere-with-photo.png",
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

export function HomeDemoPanel() {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [demoKey, setDemoKey] = useState<keyof typeof DEMO_STATES>("Warm")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showShimmer, setShowShimmer] = useState(false)
  const [displayedImageUrl, setDisplayedImageUrl] = useState("")
  const [displayedMessage, setDisplayedMessage] = useState("")
  const [photoAttached, setPhotoAttached] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

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
    setIsGenerating(true)
    setShowShimmer(true)
    setHasGenerated(true)
    setDisplayedImageUrl(variant.imageUrl)
    setDisplayedMessage("")

    scheduleTimeout(() => {
      setShowShimmer(false)

      const newMessage = variant.message
      let i = 0
      const type = () => {
        i++
        setDisplayedMessage(newMessage.slice(0, i))
        if (i < newMessage.length) {
          scheduleTimeout(type, 25)
        } else {
          setIsGenerating(false)
        }
      }
      scheduleTimeout(type, 300)
    }, 700)
  }

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_80px_-40px_rgba(17,17,16,0.14)] lg:block">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 font-mono text-[11px] tracking-widest text-muted-foreground/60 uppercase">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        Live preview
      </div>
      <div className="flex">
        <div className="flex w-52 shrink-0 flex-col gap-4 p-4">
          <div className="rounded-xl bg-background p-3 text-sm leading-relaxed text-foreground">
            <span className="text-xs text-muted-foreground">
              Describe the card.
            </span>
            <br />
            Mira turns 30 on Thursday. She&apos;s on the design team, loves
            botanical illustration and long train rides.
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Tone
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                Object.keys(DEMO_STATES) as Array<keyof typeof DEMO_STATES>
              ).map((c) => (
                <ChipButton
                  key={c}
                  onClick={() => setDemoKey(c)}
                  disabled={isGenerating}
                  active={demoKey === c}
                  className="text-xs"
                >
                  {c}
                </ChipButton>
              ))}
            </div>
          </div>
          <div className="h-30">
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
          <Button
            className="mt-auto w-full"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating…" : "Generate card"}
          </Button>
        </div>

        <div className="min-w-0 flex-1 border-l border-border px-2 py-4 xl:px-6">
          {hasGenerated && !isGenerating ? (
            <SampleCard3D
              id={`demo-${demoKey}-${photoAttached ? "photo" : "base"}`}
              imageUrl={displayedImageUrl}
              headline={displayedMessage}
              recipientName="Mira"
              message={DEMO_INSIDE_MESSAGE}
              notes={DEMO_NOTES}
              showPager={false}
            />
          ) : (
            // Same frame as the 3D card, so nothing jumps when it takes over.
            <div className="flex w-full flex-col items-center gap-6">
              <div
                className={`relative w-full ${cardBookFrameClass(false, false)}`}
              >
                {hasGenerated ? (
                  <>
                    <ClosedCardCover
                      imageUrl={displayedImageUrl}
                      headline={displayedMessage}
                      recipientName="Mira"
                    />
                    <div
                      className={`absolute inset-y-[8%] left-1/2 z-10 aspect-4/5 -translate-x-1/2 rounded-md transition-opacity duration-500 ${
                        showShimmer
                          ? "opacity-100"
                          : "pointer-events-none opacity-0"
                      }`}
                    >
                      <div className="h-full w-full animate-pulse rounded-md bg-stone-200" />
                    </div>
                  </>
                ) : (
                  <div
                    className="absolute inset-y-[8%] left-1/2 aspect-4/5 -translate-x-1/2 overflow-hidden rounded-md shadow-[0_12px_32px_-8px_rgba(17,17,16,0.22)]"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.92 0.07 18) 0%, oklch(0.82 0.12 3) 100%)",
                    }}
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60"
                        style={{ background: "oklch(0.7 0.14 18)" }}
                      >
                        <Sparkles className="h-4 w-4 stroke-white" />
                      </div>
                      <p
                        className="text-xs leading-relaxed opacity-70"
                        style={{ color: "oklch(0.25 0.06 18)" }}
                      >
                        Click Generate to see your card
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
