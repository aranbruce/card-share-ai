import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { CardTileRow } from "@/components/card-tile-row"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { OccasionCardStage } from "@/components/occasion-card-stage"
import { Button } from "@/components/ui/button"
import { getCategoryConfig, occasionTiles } from "@/lib/category-pages"
import { ALL_COMPARE_SLUGS, getCompareConfig } from "@/lib/compare-pages"
import { buildPageMetadata, SITE_NAME } from "@/lib/site-metadata"
import { breadcrumbJsonLd } from "@/lib/structured-data"

export const dynamicParams = false

export function generateStaticParams() {
  return ALL_COMPARE_SLUGS.map((slug) => ({ slug }))
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const config = getCompareConfig(slug)
  if (!config) return {}

  return buildPageMetadata({
    title: config.metaTitle,
    description: config.metaDescription,
    path: `/compare/${config.slug}`,
  })
}

/** The occasion whose sample card fronts the hero. */
const HERO_OCCASION = "birthday"
/** How many rows of the table are pulled out as "at a glance" highlights. */
const HIGHLIGHT_COUNT = 3

function FreeBadge() {
  return (
    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
      Free
    </span>
  )
}

function PickCard({
  name,
  items,
  highlighted = false,
}: {
  name: string
  items: string[]
  highlighted?: boolean
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-2xl border border-brand/30 bg-brand/5 p-7 md:p-8"
          : "rounded-2xl border border-border bg-card p-7 md:p-8"
      }
    >
      <p className="text-sm text-muted-foreground">Choose</p>
      <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
        {name} <span className="font-normal text-muted-foreground">if…</span>
      </h3>
      <ul className="mt-6 flex flex-col gap-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
            <span
              className={
                highlighted
                  ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white"
                  : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-background"
              }
            >
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params
  const config = getCompareConfig(slug)
  const hero = getCategoryConfig(HERO_OCCASION)
  if (!config || !hero) notFound()

  const highlights = config.rows.slice(0, HIGHLIGHT_COUNT)

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: config.h1, path: `/compare/${config.slug}` },
        ])}
      />

      {/* ===== HERO ===== */}
      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-360 grid-cols-1 items-center gap-x-12 px-6 md:px-15 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              {config.competitor} alternative
            </p>
            <h1 className="leading-0.95 mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              {SITE_NAME}
              <br />
              <span className="text-muted-foreground">vs</span>{" "}
              <span className="text-brand">{config.competitor}</span>
            </h1>
            <p className="mt-6 max-w-140 text-lg leading-relaxed text-muted-foreground">
              {config.lede}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  Start a card
                  <FreeBadge />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#compare">See the comparison</a>
              </Button>
            </div>
          </div>

          <OccasionCardStage config={hero} />
        </div>
      </section>

      {/* ===== AT A GLANCE ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-16 md:px-15">
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            At a glance
          </h2>
          <dl className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {highlights.map((row) => (
              <div
                key={row.feature}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <dt className="text-sm text-muted-foreground">{row.feature}</dt>
                <dd className="mt-3">
                  <p className="text-lg leading-snug font-semibold tracking-[-0.015em]">
                    <span className="sr-only">{SITE_NAME}: </span>
                    {row.us}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {config.competitor}: {row.them}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== TABLE ===== */}
      <section id="compare" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Side by side
          </p>
          <h2 className="leading-1.02 mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            How they compare
          </h2>
          {/* Small screens: one card per row, so neither column scrolls out of view. */}
          <dl className="mt-10 flex flex-col gap-3 md:hidden">
            {config.rows.map((row) => (
              <div
                key={row.feature}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <dt className="px-5 pt-4 text-sm font-medium">{row.feature}</dt>
                <dd className="mt-3 grid grid-cols-2 text-sm">
                  <div className="bg-brand/5 px-5 py-3">
                    <p className="text-xs text-muted-foreground">{SITE_NAME}</p>
                    <p className="mt-1 font-medium">{row.us}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-muted-foreground">
                      {config.competitor}
                    </p>
                    <p className="mt-1 text-muted-foreground">{row.them}</p>
                  </div>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full min-w-150 text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="w-[28%] px-6 py-5 font-medium">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th
                    scope="col"
                    className="bg-brand/5 px-6 py-5 text-base font-semibold"
                  >
                    {SITE_NAME}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-5 text-base font-semibold text-muted-foreground"
                  >
                    {config.competitor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.rows.map((row) => (
                  <tr key={row.feature} className="border-t border-border">
                    <th scope="row" className="px-6 py-4 align-top font-medium">
                      {row.feature}
                    </th>
                    <td className="bg-brand/5 px-6 py-4 align-top font-medium">
                      {row.us}
                    </td>
                    <td className="px-6 py-4 align-top text-muted-foreground">
                      {row.them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {config.competitor} details checked in {config.checkedOn} from{" "}
            {config.sources.map((source, i) => (
              <span key={source.url}>
                {i > 0
                  ? i === config.sources.length - 1
                    ? " and "
                    : ", "
                  : ""}
                <a
                  href={source.url}
                  rel="nofollow noopener"
                  target="_blank"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {source.label}
                </a>
              </span>
            ))}
            {`. Prices and features change, so check their site for the latest. ${config.competitor} is a trademark of its owner; ${SITE_NAME} isn't affiliated with it.`}
          </p>
        </div>
      </section>

      {/* ===== WHICH TO PICK ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Which to pick
          </p>
          <h2 className="leading-1.02 mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            The honest version
          </h2>
          <div className="mt-8 max-w-3xl border-l-2 border-brand pl-5">
            <p className="text-sm font-medium text-muted-foreground">
              The bottom line
            </p>
            <p className="mt-2 text-lg leading-relaxed">{config.verdict}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <PickCard name={SITE_NAME} items={config.pickUs} highlighted />
            <PickCard name={config.competitor} items={config.pickThem} />
          </div>
        </div>
      </section>

      {/* ===== OCCASIONS ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Every occasion
          </p>
          <h2 className="leading-1.02 mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            See what your card could look like
          </h2>
          <CardTileRow tiles={occasionTiles()} />
        </div>
      </section>

      <FaqSection
        eyebrow="FAQs"
        title={`${SITE_NAME} vs ${config.competitor}`}
        faqs={config.faqs}
      />

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-360 px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Try it on your next card
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Describe who it&apos;s for, share one link, and let everyone sign.
            It&apos;s free to send
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/create">
                Start a card
                <FreeBadge />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
