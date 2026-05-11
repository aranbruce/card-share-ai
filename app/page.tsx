"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Paperclip, Sparkles, X } from "lucide-react"

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

const FEATURES = [
  {
    n: "01",
    title: "One link, everyone signs",
    desc: "Each person places their note anywhere on the page. Drag, resize, rotate, add a GIF.",
  },
  {
    n: "02",
    title: "AI drafts first, you edit",
    desc: "Upload a photo or let AI generate the cover. Regenerate any line, any time. The AI has a light touch. Never saccharine.",
  },
  {
    n: "03",
    title: "Delivered as one",
    desc: "Every note, every signature, every GIF. All combined into a single, beautiful card.",
  },
]

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [demoKey, setDemoKey] = useState<keyof typeof DEMO_STATES>("Warm")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showShimmer, setShowShimmer] = useState(false)
  const [displayedImageUrl, setDisplayedImageUrl] = useState("")
  const [displayedMessage, setDisplayedMessage] = useState("")
  const [photoAttached, setPhotoAttached] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handlePhotoAttach = () => {
    setPhotoAttached(true)
  }

  const handlePhotoRemove = () => {
    setPhotoAttached(false)
  }

  const handleGenerate = () => {
    if (isGenerating) return
    const variant = photoAttached
      ? DEMO_STATES[demoKey].withPhoto
      : DEMO_STATES[demoKey].base
    setIsGenerating(true)
    setShowShimmer(true)
    setHasGenerated(true)
    setDisplayedMessage("")

    setTimeout(() => {
      setDisplayedImageUrl(variant.imageUrl)
      setShowShimmer(false)

      const newMessage = variant.message
      let i = 0
      const type = () => {
        i++
        setDisplayedMessage(newMessage.slice(0, i))
        if (i < newMessage.length) {
          setTimeout(type, 25)
        } else {
          setIsGenerating(false)
        }
      }
      setTimeout(type, 300)
    }, 700)
  }

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.replace("/dashboard")
        return
      }

      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  if (loading) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-6 py-[18px] backdrop-blur-sm md:px-15">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/create">Start a card</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto items-center gap-12 px-6 py-20 md:px-15 lg:gap-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-12 lg:grid-cols-[1.15fr_1fr]">
          {/* Left panel */}
          <div>
            <h1 className="mt-5 text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              Greeting cards,
              <br />
              <span className="text-muted-foreground">
                generated in seconds,{" "}
              </span>
              <span className="text-brand">signed in minutes.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-muted-foreground">
              Describe the card or upload a photo. We design the cover, draft
              the message, and pass it around for the whole team to sign.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  Start a card
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                    Free
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
            {/* <div className="mt-10 flex flex-wrap items-center gap-5 font-mono text-xs tracking-[0.15em] text-muted-foreground/60 uppercase">
            Trusted by teams at
            <div className="flex gap-5 font-sans text-sm font-semibold tracking-tight text-muted-foreground">
              <span>Notion</span>
              <span>Linear</span>
              <span>Vercel</span>
              <span>Ramp</span>
            </div>
          </div> */}
          </div>

          {/* Demo panel */}
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
              {/* Form column */}
              <div className="flex w-52 shrink-0 flex-col gap-4 p-4">
                <div className="rounded-xl bg-background p-3 text-sm leading-relaxed text-foreground">
                  <span className="text-muted-foreground">
                    Describe the card.
                  </span>
                  <br />
                  Mira turns 30 on Thursday. She&apos;s on the design team,
                  loves botanical illustration and long train rides.
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Tone
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(DEMO_STATES) as Array<keyof typeof DEMO_STATES>).map(
                      (c) => (
                        <ChipButton
                          key={c}
                          onClick={() => setDemoKey(c)}
                          disabled={isGenerating}
                          active={demoKey === c}
                          className="text-xs"
                        >
                          {c}
                        </ChipButton>
                      ),
                    )}
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
                        alt="Reference"
                        className="max-h-24 max-w-full"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove reference photo"
                        onClick={handlePhotoRemove}
                        disabled={isGenerating}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePhotoAttach}
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

              {/* Card column */}
              <div className="relative min-h-64 flex-1 border-l border-border">
                {!hasGenerated ? (
                  <div
                    className="absolute inset-x-2 inset-y-4 overflow-hidden rounded-xl shadow-[0_12px_32px_-8px_rgba(17,17,16,0.22)] xl:inset-x-8"
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
                ) : (
                  <div className="absolute inset-x-2 inset-y-4 overflow-hidden rounded-xl shadow-[0_12px_32px_-8px_rgba(17,17,16,0.22)] xl:inset-x-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayedImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 z-10 transition-opacity duration-500 ${
                        showShimmer
                          ? "opacity-100"
                          : "pointer-events-none opacity-0"
                      }`}
                    >
                      <div className="h-full w-full animate-pulse bg-stone-200" />
                    </div>
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <p className="min-h-10 text-lg font-semibold text-white/90">
                        {displayedMessage}
                        {isGenerating && (
                          <span className="ml-0.5 inline-block h-[0.85em] w-0.5 translate-y-[0.1em] animate-pulse bg-white/70" />
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Big statement */}
      <section className="border-t border-border px-6 md:px-15">
        <div className="mx-auto max-w-7xl py-20">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Built for group cards
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Group cards used to take ten follow-ups. Now it takes one link.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n}>
                <div className="font-mono text-sm text-muted-foreground/60">
                  {f.n}
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t border-border bg-secondary/50 px-6 md:px-15">
        <div className="mx-auto max-w-4xl py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Start the card. We&apos;ll handle the rest.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            No account needed. Just type one sentence and go.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/create">
                Start a card
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Free
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/sign-up">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">Cards worth signing.</p>
        </div>
      </footer>
    </div>
  )
}
