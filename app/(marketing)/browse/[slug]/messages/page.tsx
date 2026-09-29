import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { Button } from "@/components/ui/button"
import {
  ALL_MESSAGE_SLUGS,
  countMessages,
  getCardMessages,
} from "@/lib/card-messages"
import { getCategoryConfig } from "@/lib/category-pages"
import { buildPageMetadata } from "@/lib/site-metadata"
import { breadcrumbJsonLd } from "@/lib/structured-data"

export const dynamicParams = false

export function generateStaticParams() {
  return ALL_MESSAGE_SLUGS.map((slug) => ({ slug }))
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getCardMessages(slug)
  if (!page) return {}

  return buildPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/browse/${slug}/messages`,
    imageUrl: `/og/occasion/${slug}`,
  })
}

/** Turns a group title into an in-page anchor, e.g. "Funny messages" → "funny-messages". */
function anchorFor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default async function CardMessagesPage({ params }: PageProps) {
  const { slug } = await params
  const page = getCardMessages(slug)
  const occasion = getCategoryConfig(slug)
  if (!page || !occasion) notFound()

  const total = countMessages(page)
  const occasionName = occasion.label.replace(/ cards$/, "").toLowerCase()

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Browse occasions", path: "/browse" },
          { name: occasion.label, path: `/browse/${slug}` },
          { name: "Messages", path: `/browse/${slug}/messages` },
        ])}
      />

      {/* ===== HERO ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-[1440px] px-6 md:px-15">
          <nav
            aria-label="Breadcrumb"
            className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground uppercase"
          >
            <Link href="/browse" className="hover:text-foreground">
              Occasions
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/browse/${slug}`} className="hover:text-foreground">
              {occasion.label}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-brand">Messages</span>
          </nav>
          <h1 className="mt-5 max-w-4xl text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
            {page.h1}
          </h1>
          <p className="mt-6 max-w-[620px] text-lg leading-relaxed text-muted-foreground">
            {page.intro}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {total} {occasionName} card messages in {page.groups.length} groups
          </p>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold tracking-[-0.015em]">
                Tips for writing yours
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {page.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-brand"
                      aria-hidden
                    />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            <nav
              aria-label="Message groups"
              className="rounded-2xl border border-border p-6"
            >
              <h2 className="text-lg font-semibold tracking-[-0.015em]">
                Jump to
              </h2>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {page.groups.map((group) => (
                  <li key={group.title}>
                    <a
                      href={`#${anchorFor(group.title)}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      {/* ===== MESSAGE GROUPS ===== */}
      {page.groups.map((group) => (
        <section
          key={group.title}
          id={anchorFor(group.title)}
          className="scroll-mt-20 border-t border-border"
        >
          <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-15">
            <h2 className="text-2xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-3xl">
              {group.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {group.intro}
            </p>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.messages.map((message) => (
                <li
                  key={message}
                  className="rounded-xl border border-border bg-card px-5 py-4 text-[15px] leading-relaxed"
                >
                  {message}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* ===== CTA ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-[1440px] px-6 py-20 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
            Found the words? Now get everyone else&apos;s
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
            {`Start a ${occasionName} card, share one link, and the whole group signs from their own phone. The AI designs the cover. It's free`}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/create">
                {occasion.ctaText}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Free
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/browse/${slug}`}>
                About {occasion.label.toLowerCase()}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <FaqSection
        eyebrow={`${occasion.label.replace(/ cards$/, "")} message FAQs`}
        title="Common questions"
        faqs={page.faqs}
      />
    </main>
  )
}
