import type { Metadata } from "next"
import Link from "next/link"
import { JsonLd } from "@/components/json-ld"
import { Button } from "@/components/ui/button"
import { COMPARE_CONFIGS } from "@/lib/compare-pages"
import { buildPageMetadata, SITE_NAME } from "@/lib/site-metadata"
import { breadcrumbJsonLd } from "@/lib/structured-data"

export const metadata: Metadata = buildPageMetadata({
  title: "Group Card App Alternatives Compared",
  description:
    "How CardShare.ai compares with Kudoboard, GroupGreeting, Padlet and SendWishOnline for group cards: price, AI features, Slack and what signers need.",
  path: "/compare",
})

export default function CompareIndexPage() {
  const comparisons = Object.values(COMPARE_CONFIGS)

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ])}
      />

      <section className="py-20">
        <div className="mx-auto max-w-[1440px] px-6 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Compare
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
            How {SITE_NAME} compares with other group card apps
          </h1>
          <p className="mt-6 max-w-[620px] text-lg leading-relaxed text-muted-foreground">
            Every tool here lets a group sign one card from a link. They differ
            on price, what the AI does, and what the recipient actually gets.
            Here&apos;s an honest side-by-side for each
          </p>

          <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {comparisons.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <h2 className="text-xl font-semibold tracking-[-0.02em]">
                    {c.h1}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {c.lede}
                  </p>
                  <span className="mt-4 text-sm font-medium text-brand">
                    See the comparison
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-[1440px] px-6 py-24 text-center md:px-15">
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
