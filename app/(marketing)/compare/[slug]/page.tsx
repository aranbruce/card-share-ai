import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { Button } from "@/components/ui/button"
import { getCategoryConfig } from "@/lib/category-pages"
import {
  ALL_COMPARE_SLUGS,
  COMPARE_CONFIGS,
  getCompareConfig,
  type CompareMark,
} from "@/lib/compare-pages"
import { sitePreviewImagePath } from "@/lib/site-preview-pages"
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
    imageUrl: sitePreviewImagePath(`compare-${config.slug}`),
  })
}

/** The occasion whose cover stands in for our card in the hero. */
const HERO_OCCASION = "birthday"

/** The table's label column, then one column per product. */
const TABLE_COLS = "md:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,1fr)]"

/**
 * On small screens the feature name spans both columns, so it gets the brand tint on its left
 * half to keep our column one unbroken strip down the table.
 */
const MOBILE_SPLIT_TINT =
  "max-md:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_5%,transparent)_50%,transparent_50%)]"

const MARK_LABEL: Record<CompareMark, string> = {
  yes: "Yes",
  partly: "Partly",
  no: "No or not listed",
}

function FreeBadge() {
  return (
    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
      Free
    </span>
  )
}

function CheckDot({
  brand = false,
  className = "",
}: {
  brand?: boolean
  className?: string
}) {
  return (
    <span
      className={`grid size-5 shrink-0 place-items-center rounded-full ${brand ? "bg-brand text-white" : "bg-foreground text-background"} ${className}`}
    >
      <Check className="size-3" strokeWidth={4} aria-hidden />
    </span>
  )
}

/** Yes / partly / no marker. Our "yes" is in brand colour; theirs is in ink. */
function Mark({ mark, brand = false }: { mark: CompareMark; brand?: boolean }) {
  const label = <span className="sr-only">{MARK_LABEL[mark]}: </span>
  if (mark === "yes") {
    return (
      <>
        {label}
        <CheckDot brand={brand} className="mt-px" />
      </>
    )
  }
  return (
    <>
      {label}
      <span
        aria-hidden
        className={
          mark === "partly"
            ? "mt-px size-5 shrink-0 rounded-full border-[1.5px] border-foreground bg-[linear-gradient(90deg,var(--foreground)_50%,transparent_50%)]"
            : "mt-px size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-muted-foreground/60"
        }
      />
    </>
  )
}

function Legend() {
  return (
    <div
      aria-hidden
      className="flex flex-wrap gap-5 text-[13px] text-muted-foreground"
    >
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded-full bg-foreground" />
        Yes
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded-full border-[1.5px] border-foreground bg-[linear-gradient(90deg,var(--foreground)_50%,transparent_50%)]" />
        Partly
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded-full border-[1.5px] border-dashed border-muted-foreground/60" />
        No / not listed
      </span>
    </div>
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
          ? "rounded-[20px] border border-brand/30 bg-brand/5 p-7 md:p-8"
          : "rounded-[20px] border border-border bg-card p-7 md:p-8"
      }
    >
      <p className="text-sm text-muted-foreground">Choose</p>
      <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
        {name} <span className="font-normal text-muted-foreground">if…</span>
      </h3>
      <ul className="mt-6 flex flex-col gap-3.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
            <CheckDot brand={highlighted} className="mt-0.5" />
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
  if (!config || !hero?.coverImage) notFound()

  const { competitor, headToHead } = config
  const others = Object.values(COMPARE_CONFIGS).filter(
    (c) => c.slug !== config.slug,
  )

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: config.h1, path: `/compare/${config.slug}` },
        ])}
      />

      {/* ===== HERO ===== */}
      <section className="py-14 md:pt-18 md:pb-22">
        <div className="mx-auto grid max-w-360 grid-cols-1 items-center gap-12 px-6 md:px-15 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div>
            <h1 className="text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl lg:text-[64px]">
              {SITE_NAME}
              <br />
              <span className="text-muted-foreground">vs</span>{" "}
              <span className="text-brand">{competitor}</span>
            </h1>
            <p className="mt-6 max-w-135 text-lg leading-relaxed text-pretty text-muted-foreground">
              {config.lede}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="shadow-[0_10px_24px_-12px_rgba(255,90,74,0.7)]"
              >
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

          {/* Head to head: our card against theirs, with the biggest difference under each. */}
          <div className="relative grid grid-cols-2 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex flex-col items-center gap-7 bg-brand/6 px-4 pt-9 pb-7 sm:px-7">
              <span className="text-[15px] font-semibold">{SITE_NAME}</span>
              <div className="relative aspect-4/5 w-full max-w-52.5 transform-[perspective(1200px)_rotateY(-10deg)_rotate(-2deg)] overflow-hidden rounded-[4px_12px_12px_4px] shadow-[0_30px_50px_-28px_rgba(40,24,10,0.5)]">
                <Image
                  src={hero.coverImage}
                  alt={`A ${SITE_NAME} birthday card cover`}
                  fill
                  sizes="210px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="w-full border-t border-brand/25 pt-4.5 text-center">
                <p className="text-2xl leading-none font-semibold tracking-[-0.035em] text-brand sm:text-4xl">
                  {headToHead.us}
                </p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {headToHead.usNote}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-7 bg-secondary px-4 pt-9 pb-7 sm:px-7">
              <span className="text-[15px] font-semibold text-muted-foreground">
                {competitor}
              </span>
              <div className="relative aspect-4/5 w-full max-w-52.5 overflow-hidden rounded-[10px] shadow-[0_20px_40px_-28px_rgba(17,17,16,0.35)] ring-1 ring-border">
                <Image
                  src={headToHead.themImage.src}
                  alt={headToHead.themImage.alt}
                  fill
                  sizes="210px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="w-full border-t border-border pt-4.5 text-center">
                <p className="text-2xl leading-none font-semibold tracking-[-0.035em] text-muted-foreground sm:text-4xl">
                  {headToHead.them}
                </p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {headToHead.themNote}
                </p>
              </div>
            </div>
            <span
              aria-hidden
              className="absolute top-[46%] left-1/2 grid size-11 -translate-1/2 place-items-center rounded-full bg-foreground text-base font-semibold tracking-[-0.02em] text-background ring-6 ring-card sm:size-14 sm:text-lg"
            >
              vs
            </span>
          </div>
        </div>
      </section>

      {/* ===== TABLE ===== */}
      <section id="compare" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15 md:py-22">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
                Side by side
              </p>
              <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
                How they compare
              </h2>
            </div>
            <Legend />
          </div>

          <div
            role="table"
            aria-label={`${SITE_NAME} vs ${competitor}`}
            className="mt-10 overflow-clip rounded-[20px] border border-border bg-card"
          >
            {/* Sticks under the site header on small screens, so the columns stay labelled. */}
            <div
              role="row"
              className={`sticky top-16 z-10 grid grid-cols-2 border-b border-border bg-card text-sm font-semibold md:static md:border-b-0 md:text-[17px] ${TABLE_COLS}`}
            >
              <span role="columnheader" className="hidden px-7 py-5.5 md:block">
                <span className="sr-only">Feature</span>
              </span>
              <span
                role="columnheader"
                className="bg-brand/5 px-4 py-3.5 text-brand md:px-7 md:py-5.5 md:text-foreground"
              >
                {SITE_NAME}
              </span>
              <span
                role="columnheader"
                className="px-4 py-3.5 text-muted-foreground md:px-7 md:py-5.5"
              >
                {competitor}
              </span>
            </div>
            {config.groups.map((group, gi) => (
              <div role="rowgroup" key={group.name}>
                <div
                  role="row"
                  className={`grid grid-cols-1 bg-background ${MOBILE_SPLIT_TINT} ${TABLE_COLS} ${gi === 0 ? "border-border md:border-t" : "border-t border-border"}`}
                >
                  <span
                    role="rowheader"
                    className="px-4 py-2.5 font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase md:px-7"
                  >
                    {group.name}
                  </span>
                  <span aria-hidden className="hidden bg-brand/5 md:block" />
                  <span aria-hidden className="hidden md:block" />
                </div>
                {group.rows.map((row) => (
                  <div
                    role="row"
                    key={row.feature}
                    className={`grid grid-cols-2 border-t border-border text-sm leading-normal md:text-[15px] ${TABLE_COLS}`}
                  >
                    <span
                      role="rowheader"
                      className={`col-span-2 px-4 pt-3.5 pb-1 text-[13px] font-semibold md:col-span-1 md:px-7 md:py-4.5 md:text-[15px] md:font-medium ${MOBILE_SPLIT_TINT}`}
                    >
                      {row.feature}
                    </span>
                    <span
                      role="cell"
                      className="flex items-start gap-2.5 bg-brand/5 px-4 pt-1 pb-4 font-medium md:gap-3 md:px-7 md:py-4.5"
                    >
                      <span className="sr-only">{SITE_NAME}: </span>
                      {row.usMark && <Mark mark={row.usMark} brand />}
                      <span>{row.us}</span>
                    </span>
                    <span
                      role="cell"
                      className="flex items-start gap-2.5 px-4 pt-1 pb-4 text-muted-foreground md:gap-3 md:px-7 md:py-4.5"
                    >
                      <span className="sr-only">{competitor}: </span>
                      {row.themMark && <Mark mark={row.themMark} />}
                      <span>{row.them}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-205 text-xs leading-relaxed text-muted-foreground">
            {competitor} details checked in {config.checkedOn} from{" "}
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
            {`. Prices and features change, so check their site for the latest. ${competitor} is a trademark of its owner; ${SITE_NAME} isn't affiliated with it.`}
          </p>
        </div>
      </section>

      {/* ===== WHICH TO PICK ===== */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-360 grid-cols-1 gap-x-18 gap-y-10 px-6 py-20 md:px-15 md:py-22 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              Which to pick
            </p>
            <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
              The honest version
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-pretty">
              {config.verdict}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PickCard name={SITE_NAME} items={config.pickUs} highlighted />
            <PickCard name={competitor} items={config.pickThem} />
          </div>
        </div>
      </section>

      <FaqSection
        eyebrow="FAQs"
        title={`${SITE_NAME} vs ${competitor}`}
        faqs={config.faqs}
        split
      />

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-360 px-6 pt-24 pb-14 md:px-15">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.035em] md:text-4xl lg:text-[52px]">
              Try it on your next card
            </h2>
            <p className="mx-auto mt-4 max-w-115 text-lg leading-relaxed text-muted-foreground">
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
          <nav
            aria-label="Other comparisons"
            className="mt-22 flex flex-col gap-x-7 gap-y-3 border-t border-border pt-6 text-sm md:flex-row md:flex-wrap md:items-center"
          >
            <span className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
              Other comparisons
            </span>
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/compare/${other.slug}`}
                className="text-foreground/85 hover:text-brand"
              >
                {SITE_NAME} vs {other.competitor}
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </main>
  )
}
