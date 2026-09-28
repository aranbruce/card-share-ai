import Link from "next/link"
import { Check, MousePointerClick } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardTileRow } from "@/components/card-tile-row"
import { SampleCard3D } from "@/components/sample-card-3d"
import type { CategoryConfig } from "@/lib/category-pages"

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
  return (
    <main>
      {/* ===== HERO ===== */}
      <section className="py-20">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-x-12 px-6 md:px-15 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              {config.badge}
            </p>
            <h1 className="mt-5 text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              {config.h1Line1}
              <br />
              <span className="text-muted-foreground">{config.h1Muted}</span>
              <br />
              <span className="text-brand">{config.h1Pop}</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-muted-foreground">
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

          <div className="relative mx-auto mt-12 w-full max-w-[480px] lg:mt-0">
            <div
              className="relative overflow-hidden rounded-3xl px-2 pt-12 pb-4 shadow-[0_40px_80px_-48px_rgba(20,14,6,0.35)] ring-1 ring-white/40 ring-inset sm:px-4"
              style={{ background: config.frontGradient }}
            >
              {/* Soft light from the top left, a little shade bottom right, and a faint dot
                  grid, for depth. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(90% 70% at 15% 0%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(20,14,6,0.12), transparent 70%)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1.5px)",
                  backgroundSize: "18px 18px",
                  maskImage:
                    "radial-gradient(70% 70% at 50% 45%, transparent 35%, black 100%)",
                }}
              />
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-sm sm:top-5 sm:left-6">
                <MousePointerClick className="size-3.5" aria-hidden />
                Open the card to read the notes
              </div>
              <SampleCard3D
                id={config.slug}
                imageUrl={config.coverImage}
                headline={config.cardTitle}
                recipientName={config.sampleRecipient}
                message={config.sampleMessage}
                notes={config.sampleNotes}
                showPager={false}
                frameClassName="aspect-square"
                className="relative w-full"
              />
            </div>

            {/* Signature chips, overlapping the stage's edges. */}
            <div
              aria-hidden
              className="absolute -top-4 -right-3 z-20 hidden items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)] sm:flex lg:-right-6"
            >
              <div className="flex -space-x-1.5">
                {config.sampleNotes.map((note) => (
                  <span
                    key={note.message}
                    className="size-5 rounded-full ring-2 ring-card"
                    style={{ background: note.color }}
                  />
                ))}
              </div>
              <div>
                <div className="font-medium">
                  {config.sampleNotes.length + 9} people signed
                </div>
                <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
                  3 in the last hour
                </div>
              </div>
            </div>
            <div
              aria-hidden
              className="absolute -bottom-5 -left-3 z-20 hidden max-w-[220px] items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-[0_18px_36px_-18px_rgba(20,14,6,0.32)] sm:flex lg:-left-8"
            >
              <span
                className="size-5 shrink-0 rounded-full"
                style={{ background: config.sampleNotes[0].color }}
              />
              <div className="text-sm leading-tight">
                {config.sampleNotes[0].message}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      {/* TODO: Add gallery */}
      {/* <section id="examples" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              {config.galleryEyebrow}
            </p>
            <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
              {config.galleryTitle}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {config.gallerySub}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
            {config.gallery.map((item, i) => (
              <article key={i}>
                <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-card">
                  <div
                    className="absolute inset-0"
                    style={{ background: item.gradient }}
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium">
                    {item.pill}
                  </span>
                  <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 backdrop-blur-sm">
                    <span className="text-xs font-medium">{item.forText}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.sigCount}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium">{item.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {item.subtitle}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section> */}

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            How it works
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {config.howTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {config.howSub}
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {config.steps.map((step) => (
              <div key={step.n}>
                <div className="font-mono text-sm text-muted-foreground/60">
                  {step.n}
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
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
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
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
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border transition-transform group-open:rotate-45 group-open:border-foreground group-open:bg-foreground group-open:text-background">
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
      {/* TODO: Add related categories */}
      {/* <section className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            More occasions
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Not a {config.label.toLowerCase().replace(" cards", "")}? We&apos;ve
            got the rest
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            The same one-link, everyone-signs flow works for every occasion
            worth marking
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {otherCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/browse/${cat.slug}`}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="aspect-video w-full"
                  style={{ background: cat.frontGradient }}
                />
                <div className="p-4">
                  <h3 className="text-base font-medium tracking-[-0.02em]">
                    {cat.label}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {cat.shortDesc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section> */}

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-[1440px] px-6 py-24 text-center md:px-15">
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
