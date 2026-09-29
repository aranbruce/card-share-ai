import type { Metadata } from "next"
import Link from "next/link"
import { SlackConversationMockup } from "@/components/slack-conversation-mockup"
import { getAppUrl } from "@/lib/app-url"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Add CardShare.ai to Slack",
  description:
    "Install the CardShare.ai Slack app to create AI greeting cards with /cardshareai and share links in your workspace.",
  path: "/slack/install",
})

const STEPS = [
  {
    n: "01",
    title: "Add CardShare.ai to Slack",
    desc: "Click the button above and approve the app for your workspace",
  },
  {
    n: "02",
    title: "Connect your account with /cardshareai-link",
    desc: "Open the link the app sends you and sign in or create a free CardShare.ai account. You only do this once",
  },
  {
    n: "03",
    title: "Create a card with /cardshareai",
    desc: "Pick the occasion, recipient and tone, and add a few personal details. AI writes a headline and makes a cover image",
  },
  {
    n: "04",
    title: "Get the team to sign it",
    desc: "Share the contributor link so everyone can add a message or GIF, then send the finished card",
  },
]

const GOOD_TO_KNOW = [
  "Free to use, with no credit card needed",
  "Replies from the app are only visible to you",
  "The app never reads channel messages, only messages you send it directly",
  "Uninstalling deletes your workspace's Slack connection and account links",
]

function AddToSlackButton() {
  return (
    <a href="/api/bot/auth/slack/start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Add to Slack"
        height="40"
        width="139"
        src="https://platform.slack-edge.com/img/add_to_slack.png"
        srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
      />
    </a>
  )
}

export default function SlackInstallPage() {
  const appHostname = getAppUrl().replace(/^https?:\/\//, "")

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-16 px-6 py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Add CardShare.ai to Slack
          </h1>
          <p className="max-w-lg text-muted-foreground">
            Create personalized AI greeting cards for birthdays, farewells and
            thank-yous without leaving Slack, then let the whole team sign them
          </p>
        </div>
        <AddToSlackButton />
        <p className="text-xs text-muted-foreground">
          Free · Set up in about 2 minutes
        </p>
      </div>

      <SlackConversationMockup appHostname={appHostname} className="w-full" />

      <section className="w-full">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
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
        <p className="mt-4 text-sm text-muted-foreground">
          Read our{" "}
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

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold">Ready to try it?</p>
        <AddToSlackButton />
      </div>
    </main>
  )
}
