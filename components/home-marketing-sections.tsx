import Link from "next/link"
import { AddToSlackPromo } from "@/components/add-to-slack-promo"
import { Button } from "@/components/ui/button"
import { SlackFlowSection } from "@/components/slack-flow"
import { FaqSection } from "@/components/faq-section"

const HOME_FAQS = [
  {
    q: "What is CardShare.ai?",
    a: "CardShare.ai makes group greeting cards. Describe who the card is for and AI designs the cover and drafts the opening message. Then you share one link and everyone signs it from their own phone or laptop.",
  },
  {
    q: "How does a group card work?",
    a: "Start a card, share the signing link with your team, family or friends, and each person adds their own note. The card stays private until you send it, then the recipient opens it as one card with every message inside.",
  },
  {
    q: "Is CardShare.ai free?",
    a: "Yes. You can design a card, collect signatures, and send it for free.",
  },
  {
    q: "Do people need an account to sign?",
    a: "No. Signers just open the link in their browser, write their note, and can add a GIF. There's no app to download and no sign-up.",
  },
  {
    q: "Can I use my own photo?",
    a: "Yes. Upload a photo when you create the card and the AI designs the cover from it. Or describe the card in a sentence and let the AI start from scratch.",
  },
  {
    q: "How does the recipient get the card?",
    a: "Send it by email from CardShare.ai, or copy the card's link and share it however you like, by text, Slack or anywhere else. It opens in any browser.",
  },
  {
    q: "Does it work in Slack?",
    a: "Yes. Add the CardShare.ai app to your Slack workspace to create a card with /cardshareai and share the signing link in any channel.",
  },
  {
    q: "What occasions can I make a card for?",
    a: "Any occasion: birthdays, work anniversaries, farewells, retirements, thank yous, weddings, new babies, get well soon, sympathy, graduations, holidays and more.",
  },
]

const FEATURES = [
  {
    n: "01",
    title: "One link, everyone signs",
    desc: "Each person places their note anywhere on the page. Drag, resize, rotate, add a GIF",
  },
  {
    n: "02",
    title: "AI drafts first, you edit",
    desc: "Upload a photo or let AI generate the cover. Regenerate any line, any time. The AI has a light touch. Never saccharine",
  },
  {
    n: "03",
    title: "Delivered as one",
    desc: "Every note, every signature, every GIF. All combined into a single, beautiful card",
  },
]

export function HomeMarketingSections() {
  return (
    <>
      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Built for group cards
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Group cards used to take ten follow-ups. Now it takes one link
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n}>
                <div className="font-mono text-sm text-muted-foreground/90">
                  {f.n}
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
          <SlackFlowSection
            intro={
              <>
                <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
                  Works with Slack
                </p>
                <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
                  Create cards without leaving Slack
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                  Install the CardShare.ai bot and send a personalized card in
                  seconds, directly from any channel or DM
                </p>
              </>
            }
            footer={<AddToSlackPromo href="/slack/install" className="mt-8" />}
          />
        </div>
      </section>

      <FaqSection eyebrow="FAQs" title="Questions, answered" faqs={HOME_FAQS} />

      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Start the card. We&apos;ll handle the rest
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            No account needed. Just type one sentence and go
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
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
