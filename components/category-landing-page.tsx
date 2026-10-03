import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardTileRow } from "@/components/card-tile-row"
import { FeatureTabs, type FeatureSketch } from "@/components/feature-tabs"
import { OccasionCardStage } from "@/components/occasion-card-stage"
import { SlackStoryboard } from "@/components/slack-storyboard"
import { PhotoTemplatesSection } from "@/components/photo-templates-section"
import {
  type CategoryConfig,
  featureSample,
  occasionTiles,
  slackStoryboardCard,
} from "@/lib/category-pages"
import { occasionPhotoTemplatesSection } from "@/lib/photo-templates-section"

/** Every occasion's steps go describe it, everyone signs, then send it. */
const OCCASION_STEP_SKETCHES: FeatureSketch[] = ["draft", "notes", "deliver"]

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="size-3"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CategoryLandingPage({ config }: { config: CategoryConfig }) {
  const templatesSection = occasionPhotoTemplatesSection(config.slug)
  return (
    <main>
      {/* ===== HERO ===== */}
      <section className="py-20">
        <div className="mx-auto grid max-w-360 grid-cols-1 items-center gap-x-8 px-6 md:grid-cols-[1.15fr_1fr] md:px-15 lg:gap-x-12">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              {config.badge}
            </p>
            <h1 className="mt-5 text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
              {config.h1Line1}
              <br />
              <span className="text-muted-foreground">{config.h1Muted}</span>
              <br />
              <span className="text-brand">{config.h1Pop}</span>
            </h1>
            <p className="mt-6 max-w-130 text-lg leading-relaxed text-muted-foreground">
              {config.lede}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  {config.ctaText}
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                    Free
                  </span>
                </Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                "No app or account to sign",
                "Signed from any phone",
                "Free to start",
              ].map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <Check className="size-4 text-brand" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <OccasionCardStage config={config} />
        </div>
      </section>

      {/* ===== PHOTO TEMPLATES ===== */}
      {templatesSection && <PhotoTemplatesSection data={templatesSection} />}

      {/* ===== HOW IT WORKS ===== */}
      <FeatureTabs
        id="how"
        eyebrow="How it works"
        title={config.howTitle}
        description={config.howSub}
        sample={featureSample(config)}
        tabs={config.steps.map((step, i) => ({
          ...step,
          sketch: OCCASION_STEP_SKETCHES[i] ?? "deliver",
        }))}
      />

      <SlackStoryboard card={slackStoryboardCard(config)} />

      {/* ===== USE CASES ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            {config.usesEyebrow}
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {config.usesTitle}
          </h2>
          <CardTileRow
            tiles={config.uses.map((use) => ({
              key: use.title,
              href: "/create",
              background: `linear-gradient(135deg, oklch(0.88 0.075 ${use.hue}), oklch(0.82 0.085 ${use.hue + 30}))`,
              coverImage: use.coverImage,
              coverHue: use.hue + 180,
              headline: use.headline,
              title: use.title,
              desc: use.desc,
            }))}
          />
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            {config.faqEyebrow}
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {config.faqTitle}
          </h2>
          <div className="mt-10">
            {config.faqs.map((faq, i) => (
              <details key={i} className="group border-b border-border py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium tracking-[-0.015em]">
                  {faq.q}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-card transition-transform group-open:rotate-45">
                    <PlusIcon />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RELATED CATEGORIES ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            More occasions
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            The same card for every moment
          </h2>
          <CardTileRow
            tiles={occasionTiles().filter((tile) => tile.key !== config.slug)}
          />
        </div>
      </section>

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-360 px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {config.ctaBandTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            {config.ctaBandSub}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/create">
                {config.ctaText}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Free
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
