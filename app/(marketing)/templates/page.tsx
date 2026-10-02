import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import {
  TemplateGallery,
  templateCreateHref,
} from "@/components/template-gallery"
import { Button } from "@/components/ui/button"
import { CARD_TEMPLATES, type CardTemplate } from "@/lib/card-templates"
import { buildPageMetadata } from "@/lib/site-metadata"
import { breadcrumbJsonLd } from "@/lib/structured-data"

export const metadata: Metadata = buildPageMetadata({
  title: "Funny Photo Card Templates",
  description:
    "Put your friend, mum or colleague on the cover. Upload one photo, pick a funny scene, and AI redraws them into it. Then share one link for everyone to sign.",
  path: "/templates",
})

/** Gallery sections, in order. Each template shows in the first section it matches. */
const SECTIONS: {
  title: string
  desc: string
  match: (t: CardTemplate) => boolean
}[] = [
  {
    title: "Birthdays",
    desc: "Another trip around the sun, starring the birthday person",
    match: (t) => t.pages.includes("birthday"),
  },
  {
    title: "Thank you and kudos",
    desc: "For the colleague who quietly holds everything together",
    match: (t) => t.pages.includes("thank-you"),
  },
  {
    title: "Farewells and retirement",
    desc: "Send them off in style, wherever they're headed next",
    match: (t) =>
      t.pages.includes("farewell") || t.pages.includes("retirement"),
  },
  {
    title: "Promotions and milestones",
    desc: "New job, big win, work anniversary or graduation day",
    match: (t) =>
      ["promotion", "work-anniversary", "graduation"].some((slug) =>
        t.pages.includes(slug),
      ),
  },
  {
    title: "Weddings and new babies",
    desc: "Life's biggest news deserves a cover to match",
    match: (t) => t.pages.includes("wedding") || t.pages.includes("new-baby"),
  },
  {
    title: "Holidays",
    desc: "Season's greetings with a festive star",
    match: (t) => t.pages.includes("holiday"),
  },
  {
    title: "Any occasion",
    desc: "Scenes that work for any card",
    match: (t) => t.occasions === "all",
  },
]

function gallerySections() {
  const placed = new Set<string>()
  return SECTIONS.map((section) => {
    const templates = CARD_TEMPLATES.filter(
      (t) => !placed.has(t.id) && section.match(t),
    )
    templates.forEach((t) => placed.add(t.id))
    return { ...section, templates }
  }).filter((section) => section.templates.length > 0)
}

const HERO_TEMPLATES = [
  "corgi-knight",
  "moon-cake",
  "corner-office-throne",
  "island-hammock",
  "dino-ride",
]

const STEPS = [
  {
    n: "01",
    title: "Pick a scene",
    desc: "Choose from the gallery below, or from the Template row when you start a card",
  },
  {
    n: "02",
    title: "Add their photo",
    desc: "Upload a clear photo of the person the card is for. AI redraws them into the scene, keeping their face and hair",
  },
  {
    n: "03",
    title: "Share one link, everyone signs",
    desc: "Send the link to the group. Everyone adds a note from their own phone, then you send the finished card",
  },
]

const WHO = [
  {
    title: "Colleagues",
    desc: "Abseil the leaver out of the office on a rope of neckties, crown the new manager in the corner office, or carry the project hero through the office shoulder-high",
    templates: ["tie-escape", "corner-office-throne", "crowd-carry"],
  },
  {
    title: "Family",
    desc: "Turn mum into an Old Master, send grandad to captain a cruise ship, or have a corgi knight your brother on his birthday",
    templates: ["old-master", "cruise-captain", "corgi-knight"],
  },
  {
    title: "Friends",
    desc: "Make your best friend an 80s album cover, a stadium rock star or the lead in their own rom-com",
    templates: ["album-cover", "banana-rockstar", "romcom-poster"],
  },
]

const PHOTO_TIPS = [
  "One person, facing the camera",
  "Good light, with the face in focus",
  "No sunglasses, masks or heavy filters",
  "Got a group photo? Crop it to the one person first",
]

const FAQS = [
  {
    q: "How do funny photo templates work?",
    a: "Pick a scene, upload a photo of the person the card is for, and the AI redraws them into the scene as the star of the cover. It keeps their face and hair from the photo and redraws the rest, so they look like they were really there. Then share one link and everyone signs the card.",
  },
  {
    q: "Can I use a photo of a friend, family member or colleague?",
    a: "Yes, that's what templates are for. Use a photo you're happy to share with the group, of someone who'll enjoy seeing themselves on the cover. If in doubt, a quick check with them, or someone close to them, never hurts.",
  },
  {
    q: "Do you keep the photo I upload?",
    a: "No. The photo is only used to draw the cover. We save the finished cover with your card, not the photo you uploaded.",
  },
  {
    q: "What kind of photo works best?",
    a: "A clear, well-lit photo of one person facing the camera. Phone photos are fine. Avoid sunglasses and heavy filters, and if you only have a group shot, crop it to the person first.",
  },
  {
    q: "What if I don't like how it came out?",
    a: "Generate it again, try a different scene, or switch to No template and describe the cover you want instead.",
  },
  {
    q: "Are photo templates free?",
    a: "Yes. Templates, signing and sending a card are all free.",
  },
  {
    q: "Is there a template for every occasion?",
    a: "There are scenes for birthdays, thank yous, farewells, retirements, promotions, work anniversaries, graduations, weddings, new babies and holidays, plus scenes that suit any card. Sympathy cards don't offer templates.",
  },
]

export default function TemplatesPage() {
  const sections = gallerySections()
  const byId = new Map(CARD_TEMPLATES.map((t) => [t.id, t]))
  const heroTemplates = HERO_TEMPLATES.flatMap((id) => byId.get(id) ?? [])

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Photo templates", path: "/templates" },
        ])}
      />

      {/* ===== HERO ===== */}
      <section className="overflow-x-clip py-20">
        <div className="mx-auto max-w-360 px-6 md:px-15">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              Funny photo templates
            </p>
            <h1 className="mt-5 text-4xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
              Put them in the picture,
              <br />
              <span className="text-muted-foreground">
                on a throne or on the moon,
              </span>
              <br />
              <span className="text-brand">signed by everyone</span>
            </h1>
            <p className="mx-auto mt-6 max-w-150 text-lg leading-relaxed text-muted-foreground">
              Upload a photo of a friend, family member or colleague and pick a
              scene. AI redraws them into it as the star of the cover, then the
              whole group signs the card
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
                <a href="#gallery">See every scene</a>
              </Button>
            </div>
          </div>

          {/* A fan of scenes, the middle one on top */}
          <div className="mx-auto mt-14 flex max-w-200 items-end justify-center">
            {heroTemplates.map((t, i) => {
              const offset = i - (heroTemplates.length - 1) / 2
              return (
                <Link
                  key={t.id}
                  href={templateCreateHref(t)}
                  aria-label={`Start a card with the ${t.name} template`}
                  className="relative -mx-3 w-[28%] shrink-0 transition-transform duration-300 hover:-translate-y-2 sm:-mx-4 sm:w-48"
                  style={{
                    zIndex: 10 - Math.abs(offset),
                    rotate: `${offset * 5}deg`,
                    translate: `0 ${Math.abs(offset) * 14}px`,
                  }}
                >
                  <div className="relative aspect-4/5 overflow-hidden rounded-xl shadow-xl ring-1 ring-black/5">
                    <Image
                      src={t.thumbnail}
                      alt=""
                      fill
                      priority={offset === 0}
                      sizes="(min-width: 640px) 192px, 28vw"
                      className="object-cover"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Their photo goes where the oval is, and the whole scene is redrawn
            around them
          </p>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            How it works
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            One photo, one scene, one link
          </h2>
          <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="border-t border-border pt-5">
                <span className="font-mono text-sm text-muted-foreground/90">
                  {step.n}
                </span>
                <p className="mt-3 text-lg font-semibold tracking-[-0.015em]">
                  {step.title}
                </p>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== WHO ===== */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Who to put in the picture
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Friends, family, the whole office
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
            {WHO.map((who) => (
              <div key={who.title}>
                <div className="flex gap-2">
                  {who.templates.flatMap((id) => {
                    const t = byId.get(id)
                    if (!t) return []
                    return (
                      <Link
                        key={id}
                        href={templateCreateHref(t)}
                        aria-label={`Start a card with the ${t.name} template`}
                        className="relative aspect-4/5 flex-1 overflow-hidden rounded-lg ring-1 ring-border transition hover:ring-2 hover:ring-foreground/40"
                      >
                        <Image
                          src={t.thumbnail}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 140px, 30vw"
                          className="object-cover"
                        />
                      </Link>
                    )
                  })}
                </div>
                <p className="mt-5 text-lg font-semibold tracking-[-0.015em]">
                  {who.title}
                </p>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {who.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      <section id="gallery" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Every scene
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {CARD_TEMPLATES.length} scenes and counting
          </h2>
          <p className="mt-4 max-w-150 text-lg leading-relaxed text-muted-foreground">
            Pick one to start a card with it. You can switch scenes, or go
            without one, while you design the card
          </p>
          <div className="mt-6 flex flex-col gap-16">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mt-8 text-xl font-semibold tracking-[-0.02em]">
                  {section.title}
                </h3>
                <p className="mt-1 text-muted-foreground">{section.desc}</p>
                <TemplateGallery
                  templates={section.templates}
                  className="mt-6"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PHOTO TIPS ===== */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-360 grid-cols-1 gap-x-18 gap-y-8 px-6 py-20 md:px-15 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              Photo tips
            </p>
            <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
              The better the photo, the better the likeness
            </h2>
          </div>
          <ul className="flex flex-col gap-4 lg:pt-10">
            {PHOTO_TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-lg">
                <Check
                  className="mt-1 size-5 shrink-0 text-brand"
                  aria-hidden
                />
                {tip}
              </li>
            ))}
            <li className="mt-2 text-muted-foreground">
              We only use the photo to draw the cover, and don&apos;t keep it
            </li>
          </ul>
        </div>
      </section>

      <FaqSection
        eyebrow="FAQs"
        title="Questions, answered"
        faqs={FAQS}
        split
      />

      {/* ===== CTA BAND ===== */}
      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-360 px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Who&apos;s starring on your next card?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Pick a scene, add their photo and share the link. It takes about a
            minute
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
