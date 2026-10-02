import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardTileRow } from "@/components/card-tile-row"
import { HeroCardFan } from "@/components/hero-card-fan"
import { HomeDemoPanel } from "@/components/home-demo-panel"
import { HomeMarketingSections } from "@/components/home-marketing-sections"
import { TemplateShowcase } from "@/components/template-showcase"
import { CARD_TEMPLATES } from "@/lib/card-templates"
import { occasionTiles } from "@/lib/category-pages"
import { buildPageMetadata, DEFAULT_DESCRIPTION } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "AI Group Greeting Cards for Teams & Slack",
  description: DEFAULT_DESCRIPTION,
  path: "/",
})

/** A spread of occasions for the home page's template strip. */
const HOME_TEMPLATES = [
  "corgi-knight",
  "tie-escape",
  "corner-office-throne",
  "island-hammock",
  "romcom-poster",
  "dino-ride",
]

// Signed-in visitors are sent to /dashboard by `proxy.ts`, so this page can be static.
export default function HomePage() {
  return (
    <>
      {/* overflow-x-clip: the outer fan cards reach past the browser into the page gutters */}
      <section className="overflow-x-clip py-20">
        <div className="mx-auto max-w-360 px-6 md:px-15">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              Group greeting cards,
              <br />
              <span className="text-muted-foreground">
                generated in seconds,
              </span>
              <br />
              <span className="text-brand">signed in minutes</span>
            </h1>
            <p className="mx-auto mt-6 max-w-140 text-lg leading-relaxed text-muted-foreground">
              Describe the card or upload a photo. We design the cover, draft
              the message, and pass it around for the whole team to sign
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
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-250 md:mt-47.5">
            <HeroCardFan>
              <HomeDemoPanel />
            </HeroCardFan>
          </div>
        </div>
      </section>

      {/* ===== OCCASIONS ===== */}
      <section id="occasions" className="border-border md:border-t">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Browse occasions
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
            Pick the moment worth marking together
          </h2>
          <CardTileRow tiles={occasionTiles()} />
        </div>
      </section>

      <TemplateShowcase
        templates={HOME_TEMPLATES.flatMap(
          (id) => CARD_TEMPLATES.find((t) => t.id === id) ?? [],
        )}
      />

      <HomeMarketingSections />
    </>
  )
}
