import type { Metadata } from "next"
import Link from "next/link"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Use CardShare.ai in Claude",
  description:
    "Connect CardShare.ai to Claude to create AI greeting cards from a chat, put your own photo on the cover, edit cards and share the link for everyone to sign.",
  path: "/claude",
})

const CONNECTOR_URL = "https://www.cardshare.ai/mcp"

const STEPS = [
  {
    n: "01",
    title: "Find CardShare.ai in Claude's connectors",
    desc: "In Claude, open Settings → Connectors, browse the directory and choose CardShare.ai",
  },
  {
    n: "02",
    title: "Sign in and allow access",
    desc: "Click Connect, then sign in or create a free CardShare.ai account with Google, GitHub or email. On the next screen, click Allow to let Claude make and edit cards in your account",
  },
  {
    n: "03",
    title: "Ask Claude for a card",
    desc: "Say who it's for, the occasion and a few personal details. Claude writes the headline, draws the cover and shows the card right in the chat",
  },
  {
    n: "04",
    title: "Get everyone to sign it",
    desc: "Copy the invite link from the card and share it with the group. When everyone has signed, send the recipient their card",
  },
]

const PROMPTS = [
  "Make a birthday card for Sarah from the design team. She loves rock climbing, so make it Epic",
  "Make Dan a farewell card. I have a photo of him on his boat I'd like on the cover",
  "Make the headline on Sarah's card punchier",
  "Add my message to Sarah's card: Happy birthday! Thanks for every belay",
  "How many people have signed Sarah's card?",
  "Show me the cards I've made",
]

const CAPABILITIES = [
  {
    title: "Create a card",
    desc: "Give the recipient, who it's from, the occasion (birthday, thank you, congratulations, holiday, sympathy or anything else) and any personal details. Pick a tone: Heartfelt, Roast, Dad jokes or Epic. Sympathy cards always stay gentle. It takes about 20 to 40 seconds.",
  },
  {
    title: "Put your own photo on the cover",
    desc: "Ask for a card with your photo, or press Use my photo on any card Claude shows you. Choose the photo in the picker that appears in the chat and the cover is drawn from it. Claude can't pass on a photo attached to the chat, so you pick it in the picker.",
  },
  {
    title: "Edit a card",
    desc: "Change the headline on the front, the recipient or sender names, or your own message inside the card. If you haven't placed your message yet, it goes in the middle of the inside page, and you can move it from the edit page.",
  },
  {
    title: "Check on your cards",
    desc: "List your cards, newest first, or look at one to see how many people have signed it, with its links to edit, invite people to sign and view it.",
  },
]

const GOOD_TO_KNOW = [
  "Free to use, with no credit card needed",
  "Claude only works with cards in the account you connect",
  "Photos you choose are only used to draw the cover; we don't keep them",
  "Moving notes, adding GIFs, extra pages and sending the card happen on the website, through the card's edit link",
  "Disconnect at any time from Claude's Settings → Connectors",
]

const TROUBLESHOOTING = [
  {
    q: "Claude doesn't show the card, only links",
    a: "Some Claude apps don't show interactive views yet. The links do the same job: open the edit link to see and change the card.",
  },
  {
    q: "The photo picker says photo upload isn't available",
    a: "Ask Claude to make the card without a photo, then open the edit link on the website to add a reference photo there.",
  },
  {
    q: "A photo link has expired",
    a: "Photo links last 30 minutes. Ask Claude to show the card again and use the new Use my photo button.",
  },
  {
    q: "You've made a lot of cards in a short time",
    a: "Card and cover generation is limited to 10 every 10 minutes per account. Wait a few minutes and try again.",
  },
]

export default function ClaudeConnectorPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-16 px-6 py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Use CardShare.ai in Claude
        </h1>
        <p className="max-w-lg text-muted-foreground">
          Ask Claude for a group greeting card and it writes the headline, draws
          the cover and shows the card in your chat, ready to share for everyone
          to sign
        </p>
        <p className="text-xs text-muted-foreground">
          Free · Set up in about a minute
        </p>
      </div>

      <section className="w-full">
        <h2 className="text-xl font-semibold tracking-tight">
          Connect CardShare.ai
        </h2>
        <ol className="mt-6 flex flex-col gap-5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="mt-0.5 shrink-0 font-mono text-sm text-muted-foreground/90">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[-0.015em]">
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          The connector&apos;s address is{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">
            {CONNECTOR_URL}
          </code>
          .
        </p>
      </section>

      <section className="w-full">
        <h2 className="text-xl font-semibold tracking-tight">Things to ask</h2>
        <ul className="mt-6 flex flex-col gap-3">
          {PROMPTS.map((prompt) => (
            <li
              key={prompt}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              &ldquo;{prompt}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full">
        <h2 className="text-xl font-semibold tracking-tight">
          What Claude can do
        </h2>
        <dl className="mt-6 flex flex-col gap-5">
          {CAPABILITIES.map((c) => (
            <div key={c.title}>
              <dt className="text-sm font-semibold tracking-[-0.015em]">
                {c.title}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {c.desc}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Each card Claude shows has buttons to open it, copy the invite link
          and use your own photo.
        </p>
      </section>

      <section className="w-full">
        <h2 className="text-xl font-semibold tracking-tight">Good to know</h2>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          {GOOD_TO_KNOW.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-foreground">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full">
        <h2 className="text-xl font-semibold tracking-tight">
          If something goes wrong
        </h2>
        <dl className="mt-6 flex flex-col gap-5">
          {TROUBLESHOOTING.map((t) => (
            <div key={t.q}>
              <dt className="text-sm font-semibold tracking-[-0.015em]">
                {t.q}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t.a}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Still stuck? Email{" "}
          <a
            href="mailto:cardshareai@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            cardshareai@gmail.com
          </a>
          . Read our{" "}
          <Link
            href="/privacy"
            className="text-foreground underline underline-offset-4"
          >
            privacy policy
          </Link>{" "}
          and the{" "}
          <Link
            href="/subprocessors"
            className="text-foreground underline underline-offset-4"
          >
            services we use
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
