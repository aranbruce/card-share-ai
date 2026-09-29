import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { JsonLd } from "@/components/json-ld"
import { Button } from "@/components/ui/button"
import { ALL_COMPARE_SLUGS, getCompareConfig } from "@/lib/compare-pages"
import { buildPageMetadata, SITE_NAME } from "@/lib/site-metadata"
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data"

export const dynamicParams = false

export function generateStaticParams() {
  return ALL_COMPARE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const config = getCompareConfig(slug)
  if (!config) return {}

  return buildPageMetadata({
    title: config.metaTitle,
    description: config.metaDescription,
    path: `/compare/${config.slug}`,
  })
}

function ReasonList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold tracking-[-0.015em]">{title}</h3>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const config = getCompareConfig(slug)
  if (!config) notFound()

  return (
    <main>
      <JsonLd data={faqPageJsonLd(config.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: config.h1, path: `/compare/${config.slug}` },
        ])}
      />

      {/* ===== HERO ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-[1440px] px-6 md:px-15">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              {config.competitor} alternative
            </p>
            <h1 className="mt-5 text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              {config.h1}
            </h1>
            <p className="mt-6 max-w-[620px] text-lg leading-relaxed text-muted-foreground">
              {config.lede}
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
                <Link href="/browse">Browse occasions</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TABLE ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Side by side
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            How they compare
          </h2>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th scope="col" className="w-1/4 px-5 py-4 font-medium">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    {SITE_NAME}
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    {config.competitor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.rows.map((row) => (
                  <tr key={row.feature} className="border-t border-border">
                    <th scope="row" className="px-5 py-4 align-top font-medium">
                      {row.feature}
                    </th>
                    <td className="px-5 py-4 align-top">{row.us}</td>
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      {row.them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {config.competitor} details checked in {config.checkedOn} from{" "}
            {config.sources.map((source, i) => (
              <span key={source.url}>
                {i > 0 ? " and " : ""}
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
            . Prices and features change, so check their site for the latest.{" "}
            {config.competitor} is a trademark of its owner; {SITE_NAME}{" "}
            isn&apos;t affiliated with it.
          </p>
        </div>
      </section>

      {/* ===== WHICH TO PICK ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Which to pick
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            The honest version
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ReasonList title={config.pickUsTitle} items={config.pickUs} />
            <ReasonList title={config.pickThemTitle} items={config.pickThem} />
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            FAQs
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {SITE_NAME} vs {config.competitor}
          </h2>
          <div className="mt-10">
            {config.faqs.map((faq) => (
              <div key={faq.q} className="border-b border-border py-5">
                <h3 className="text-base font-medium tracking-[-0.015em]">
                  {faq.q}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-[1440px] px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Try it on your next card
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Describe who it&apos;s for, share one link, and let everyone sign.
            It&apos;s free to send
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
          </div>
        </div>
      </section>
    </main>
  )
}
