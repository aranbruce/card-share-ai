import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CardTileRow } from "@/components/card-tile-row"
import { Button } from "@/components/ui/button"
import { getBrowseCategories } from "@/lib/category-pages"
import { buildPageMetadata } from "@/lib/site-metadata"

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
    desc: "Deliver by email or shareable link, on the day, or scheduled in advance. It opens beautifully in the browser, every note included",
  },
]

const FAQS = [
  {
    q: "What occasions can I send a group card for?",
    a: "Any occasion worth marking: birthdays, work anniversaries, farewells, thank yous, weddings, promotions, kudos, holidays, get well soons, and more. If the group chat is buzzing about it, it's worth a card.",
  },
  {
    q: "How does everyone sign the same card?",
    a: "You share one link with your group. Each person opens it on their own phone or laptop, adds their note, picks an ink colour, and can attach a photo or GIF. The card stays private until you choose to send it.",
  },
  {
    q: "Does everyone who signs need an account?",
    a: "No. Signers just need the link, no account, no app, and no download required. They open it in the browser and sign in seconds.",
  },
  {
    q: "Is it free to send a group card?",
    a: "Yes. You can design a card, collect signatures, and send it for free. Paid plans add scheduled delivery, team features, and a saved archive of every card.",
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
  const cards = [
    { slug: "birthday", rotate: -13, tx: -118, ty: 16, z: 0 },
    { slug: "wedding", rotate: -4, tx: -42, ty: 4, z: 1 },
    { slug: "promotion", rotate: 15, tx: 132, ty: 22, z: 2 },
    { slug: "thank-you", rotate: 6, tx: 56, ty: -4, z: 3 },
  ].map((c) => ({ ...c, cat: byslug[c.slug] }))

  return (
    <div className="relative grid min-h-[460px] place-items-center">
      {cards.map((c) => (
        <Link
          key={c.slug}
          href={`/browse/${c.slug}`}
          className="group absolute hover:z-10!"
          style={{
            zIndex: c.z,
            transform: `rotate(${c.rotate}deg) translate(${c.tx}px, ${c.ty}px)`,
          }}
        >
          <div className="relative h-[356px] w-[262px] overflow-hidden rounded-xl shadow-[0_20px_40px_-20px_rgba(20,14,6,0.30)] transition-transform duration-300 ease-out group-hover:-translate-y-3 group-hover:shadow-[0_32px_56px_-24px_rgba(20,14,6,0.40)]">
            <Image
              src={c.cat.coverImage}
              alt={`${c.cat.label}: ${c.cat.cardTitle}`}
              fill
              sizes="262px"
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent" />
            {/* Only the front card's title shows; the others' would be cut off by the fan, so
                theirs appear when the card is hovered to the front. */}
            <p
              className={`absolute inset-x-0 bottom-0 p-5 text-center text-xl font-bold text-white transition-opacity duration-300 ${
                c.z === 3 ? "" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {c.cat.cardTitle}
            </p>
          </div>
        </Link>
      ))}

      {/* Sig float — top right */}
      <div
        className="absolute top-[34px] right-[-26px] z-20 flex items-center gap-[9px] rounded-xl border border-border bg-card px-3 py-2 text-xs"
        style={{ boxShadow: "0 18px 36px -18px rgba(20,14,6,0.32)" }}
      >
        <span
          className="size-5 shrink-0 rounded-full"
          style={{ background: "oklch(0.82 0.1 18)" }}
        />
        <div>
          <div className="font-medium">120,000+ cards sent</div>
          <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            across every occasion
          </div>
        </div>
      </div>

      {/* Sig float — bottom left */}
      <div
        className="absolute bottom-[60px] left-[-34px] z-20 flex items-center gap-[9px] rounded-xl border border-border bg-card px-3 py-2"
        style={{ boxShadow: "0 18px 36px -18px rgba(20,14,6,0.32)" }}
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
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                    Free
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#occasions">Browse occasions</a>
              </Button>
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

          <CardTileRow
            tiles={getBrowseCategories().map((cat) => ({
              key: cat.slug,
              href: `/browse/${cat.slug}`,
              background: cat.frontGradient,
              coverImage: cat.coverImage,
              coverHue: cat.coverHue,
              headline: cat.cardTitle,
              title: cat.label,
              desc: cat.shortDesc,
            }))}
          />
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
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
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
