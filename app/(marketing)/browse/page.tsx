import type { Metadata } from "next"
import Link from "next/link"
import { CardTileRow } from "@/components/card-tile-row"
import { CardThumb3D } from "@/components/dashboard/card-thumb-3d"
import { Button } from "@/components/ui/button"
import { JsonLd } from "@/components/json-ld"
import { getBrowseCategories, occasionTiles } from "@/lib/category-pages"
import { buildPageMetadata } from "@/lib/site-metadata"
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data"

export const metadata: Metadata = buildPageMetadata({
  title: "Online Group Cards for Every Occasion",
  description:
    "Browse every occasion. Birthday, work anniversary, wedding, promotion, thank you, farewell, and kudos cards - one link, everyone signs, AI designs the cover.",
  path: "/browse",
})

const STEPS = [
  {
    n: "01",
    title: "Pick the occasion and describe it",
    desc: "Tell us who the card is for in one sentence. The AI drafts a cover image and an opening note. Regenerate either until it's right",
  },
  {
    n: "02",
    title: "Share one link, everyone signs",
    desc: "Drop the link in your group chat, team Slack, or family WhatsApp. Each person adds their note from their own phone. No app needed",
  },
  {
    n: "03",
    title: "Send it when the card is full",
    desc: "Deliver by email or shareable link, whenever you're ready. It opens beautifully in the browser, every note included",
  },
]

const FAQS = [
  {
    q: "What occasions can I send a group card for?",
    a: "Any occasion worth marking: birthdays, work anniversaries, farewells, thank yous, weddings, promotions, kudos, holidays, get well soons, and more. If the group chat is buzzing about it, it's worth a card.",
  },
  {
    q: "How does everyone sign the same card?",
    a: "You share one link with your group. Each person opens it on their own phone or laptop, adds their note, picks an ink color, and can attach a GIF. The card stays private until you choose to send it.",
  },
  {
    q: "Does everyone who signs need an account?",
    a: "No. Signers just need the link, no account, no app, and no download required. They open it in the browser and sign in seconds.",
  },
  {
    q: "Is it free to send a group card?",
    a: "Yes. You can design a card, collect signatures, and send it for free, and nobody who signs needs an account.",
  },
  {
    q: "How is this different from a paper card?",
    a: "The recipient gets a link that opens beautifully on any device and they can revisit it any time. No lost paper, no illegible handwriting. And you can collect signatures from people anywhere in the world.",
  },
]

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

function HeroFan() {
  const byslug = Object.fromEntries(
    getBrowseCategories().map((c) => [c.slug, c]),
  )
  // A staircase: each card sits higher and further right than the one behind it, so every
  // card's bottom (where its title is) shows below the card in front.
  const cards = [
    { slug: "birthday", rotate: -4, tx: -150, ty: 105 },
    { slug: "wedding", rotate: -1.5, tx: -50, ty: 35 },
    { slug: "thank-you", rotate: 1.5, tx: 50, ty: -35 },
    { slug: "promotion", rotate: 4, tx: 150, ty: -105 },
  ].map((c, z) => ({ ...c, z, cat: byslug[c.slug] }))

  return (
    <div className="relative grid min-h-[640px] place-items-center">
      {/* An angled gradient square behind the cards. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[440px] -translate-1/2 rotate-[-8deg] rounded-[48px] shadow-[0_40px_80px_-48px_rgba(20,14,6,0.35)] ring-1 ring-white/40 ring-inset"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.88 0.08 18), oklch(0.85 0.09 330) 50%, oklch(0.86 0.08 250))",
        }}
      />
      {cards.map((c) => (
        // The dashboard's standing 3D card; hovering brings it to the front and opens it.
        <Link
          key={c.slug}
          href={`/browse/${c.slug}`}
          aria-label={`${c.cat.label}: ${c.cat.cardTitle}`}
          className="group @container absolute h-[400px] w-[300px] hover:z-10!"
          style={{
            zIndex: c.z,
            transform: `rotate(${c.rotate}deg) translate(${c.tx}px, ${c.ty}px)`,
          }}
        >
          <div
            className="hero-drift absolute inset-0"
            style={{ animationDelay: `${-c.z * 1.4}s` }}
          >
            <CardThumb3D
              imageUrl={c.cat.coverImage}
              headline={c.cat.cardTitle}
              alt=""
              hue={c.cat.coverHue}
              priority
            />
          </div>
        </Link>
      ))}

      {/* Sig float — bottom right */}
      <div
        className="hero-drift absolute right-[-10px] bottom-[40px] z-20 flex items-center gap-[9px] rounded-xl border border-border bg-card px-3 py-2 text-xs"
        style={{ boxShadow: "0 18px 36px -18px rgba(20,14,6,0.32)" }}
      >
        <span
          className="size-5 shrink-0 rounded-full"
          style={{ background: "oklch(0.82 0.1 18)" }}
        />
        <div>
          <div className="font-medium">Free to start</div>
          <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            design, sign and send
          </div>
        </div>
      </div>

      {/* Sig float — top left */}
      <div
        className="hero-drift absolute top-[40px] left-[-10px] z-20 flex items-center gap-[9px] rounded-xl border border-border bg-card px-3 py-2"
        style={{
          boxShadow: "0 18px 36px -18px rgba(20,14,6,0.32)",
          animationDelay: "-3s",
        }}
      >
        <span
          className="size-5 shrink-0 rounded-full"
          style={{ background: "oklch(0.84 0.08 330)" }}
        />
        <div className="text-sm leading-tight">
          <div>So happy for you!</div>
          <div className="text-xs text-muted-foreground">- the whole team</div>
        </div>
      </div>
    </div>
  )
}

export default function CardsPage() {
  return (
    <main>
      <JsonLd data={faqPageJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Browse occasions", path: "/browse" },
        ])}
      />
      {/* ===== HERO ===== */}
      <section className="py-20">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-x-12 px-6 md:px-15 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              A card for every occasion
            </p>
            <h1 className="mt-5 text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              A group card for
              <br />
              <span className="text-muted-foreground">every moment</span>
              <br />
              <span className="text-brand">worth marking</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-muted-foreground">
              Pick the occasion, share one link, and the whole group signs from
              their own phone. AI designs the cover and drafts the opening note.
              You just say who it&apos;s for
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  Start a card
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold">
                    Free
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#occasions">Browse occasions</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-2">
              <span className="mr-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                Popular
              </span>
              {getBrowseCategories().map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/browse/${cat.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-foreground/30"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: cat.frontGradient }}
                  />
                  {cat.label.replace(/ cards$/, "")}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroFan />
          </div>
        </div>
      </section>

      {/* ===== OCCASIONS ===== */}
      <section id="occasions" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Browse occasions
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
            Pick the moment worth marking together
          </h2>

          <CardTileRow tiles={occasionTiles()} />
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            How it works
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            From one sentence to a signed group card
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            The whole flow in three steps: cover, signatures, delivery. Takes
            about two minutes to set up
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <div className="font-mono text-sm text-muted-foreground/90">
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

      {/* ===== FAQ ===== */}
      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            FAQs
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Everything about group cards
          </h2>
          <div className="mt-10">
            {FAQS.map((faq, i) => (
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

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-[1440px] px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            What&apos;s the occasion?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Pick the occasion, describe who it&apos;s for, and share one link.
            The whole group signs, we handle the rest
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/create">
                Start a card
                <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold">
                  Free
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#occasions">Browse occasions</a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
