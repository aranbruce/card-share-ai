import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Support",
  description:
    "Get help with CardShare.ai and the CardShare.ai Slack app — contact details, common questions, and troubleshooting for the /cardshareai commands.",
  path: "/support",
  robots: { index: true, follow: true },
})

const CONTACT_EMAIL = "hello@cardshare.ai"

const FAQS = [
  {
    question: "How do I install the Slack app?",
    answer: (
      <>
        Go to{" "}
        <Link
          href="/slack/install"
          className="text-foreground underline underline-offset-4"
        >
          cardshare.ai/slack/install
        </Link>{" "}
        and click <strong>Add to Slack</strong>. Approve the requested
        permissions and the app is available across your workspace. You need
        permission to install apps in your Slack workspace; if you don&apos;t
        have it, Slack will send a request to your workspace admins.
      </>
    ),
  },
  {
    question: "What Slack commands are available?",
    answer: (
      <>
        <code className="rounded bg-muted px-1 py-0.5">/cardshareai</code> opens
        a form to create a new card — pick the occasion, recipient, and tone,
        and AI generates a personalised headline and cover image.{" "}
        <code className="rounded bg-muted px-1 py-0.5">/cardshareai-link</code>{" "}
        connects your Slack user to your CardShare.ai account so cards you
        create in Slack show up in your dashboard.
      </>
    ),
  },
  {
    question: "Why does the app ask me to connect my account?",
    answer: (
      <>
        Cards belong to a CardShare.ai account so you can manage them from the
        dashboard, collect contributions, and send the finished card. The first
        time you use{" "}
        <code className="rounded bg-muted px-1 py-0.5">/cardshareai</code>,
        we&apos;ll send you a private link to connect (or create) your account.
        The link expires after 15 minutes — just run the command again if it
        lapses.
      </>
    ),
  },
  {
    question: "The slash command isn't responding. What should I check?",
    answer: (
      <>
        First, confirm the app is still installed in your workspace (ask a
        workspace admin, or check Slack&apos;s &quot;Apps&quot; section). If it
        is, try running the command again — occasional timeouts can happen. If
        the problem persists, email us with your workspace name and roughly when
        it happened and we&apos;ll investigate.
      </>
    ),
  },
  {
    question: "How do I remove the app from my workspace?",
    answer: (
      <>
        A workspace admin can remove it from Slack under{" "}
        <strong>Manage apps</strong> in your workspace settings. Removing the
        app revokes its access to your workspace. Cards you already created
        remain in your CardShare.ai account and can be deleted from your
        dashboard at any time.
      </>
    ),
  },
  {
    question: "What data does the Slack app access?",
    answer: (
      <>
        Only what it needs to run: workspace and user identifiers to respond to
        your slash commands, and the card details you enter into the creation
        form. We never read your channels or messages. See our{" "}
        <Link
          href="/privacy"
          className="text-foreground underline underline-offset-4"
        >
          privacy policy
        </Link>{" "}
        for full details.
      </>
    ),
  },
  {
    question: "How do I delete a card or my account?",
    answer: (
      <>
        Delete cards any time from your{" "}
        <Link
          href="/dashboard"
          className="text-foreground underline underline-offset-4"
        >
          dashboard
        </Link>
        . To delete your account and associated data, email us at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-foreground underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        and we&apos;ll take care of it.
      </>
    ),
  },
]

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:px-15">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Support</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Need a hand with CardShare.ai or our Slack app? Start with the common
        questions below, or get in touch — we&apos;re happy to help.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
        <h2 className="text-base font-semibold tracking-tight">Contact us</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Email is the fastest way to reach us. We aim to respond to all support
          requests within 2 business days.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Mail className="size-4" aria-hidden />
          {CONTACT_EMAIL}
        </a>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          To help us resolve things quickly, include the email on your
          CardShare.ai account, your Slack workspace name (for Slack app
          issues), and what you were doing when the problem occurred.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-base font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <dl className="mt-6 space-y-8">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="text-sm font-semibold text-foreground">
                {faq.question}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-base font-semibold tracking-tight">
          Helpful links
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            <Link
              href="/slack/install"
              className="text-foreground underline underline-offset-4"
            >
              Add CardShare.ai to Slack
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="text-foreground underline underline-offset-4"
            >
              Privacy policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="text-foreground underline underline-offset-4"
            >
              Terms of use
            </Link>
          </li>
        </ul>
      </section>
    </main>
  )
}
