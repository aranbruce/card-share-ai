import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"
import { AddToSlackPromo } from "@/components/add-to-slack-promo"
import { SlackFlowStack } from "@/components/slack-flow"
import { sitePreviewImagePath } from "@/lib/site-preview-pages"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Add CardShare.ai to Slack",
  description:
    "Install the CardShare.ai Slack app to create AI greeting cards with /cardshareai and share links in your workspace.",
  path: "/slack/install",
  imageUrl: sitePreviewImagePath("slack"),
})

const GOOD_TO_KNOW = [
  "Free to use, with no credit card needed",
  "The first time you use it, the app sends you a link to sign in or create a free CardShare.ai account. You can also run /cardshareai-link",
  "Replies from the app are only visible to you",
  "The app never reads channel messages, only messages you send it directly",
  "Uninstalling deletes your workspace's Slack connection and account links",
]

const INSTALL_HREF = "/api/bot/auth/slack/start"

export default function SlackInstallPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-16 px-6 py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-4xl md:text-5xl">
            Add CardShare.ai to <span className="text-brand">Slack</span>
          </h1>
          <p className="max-w-lg text-muted-foreground">
            Create personalized AI greeting cards for birthdays, farewells and
            thank-yous without leaving Slack, then let the whole team sign them
          </p>
        </div>
        <AddToSlackPromo href={INSTALL_HREF} />
      </div>

      <section aria-label="How it works" className="w-full">
        <SlackFlowStack />
      </section>

      <section className="w-full rounded-3xl bg-secondary px-6 py-7 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">
          Good to know
        </h2>
        <ul className="mt-4 divide-y divide-border border-b border-border">
          {GOOD_TO_KNOW.map((item) => (
            <li key={item} className="flex items-start gap-4 py-4">
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted-foreground">
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
        <AddToSlackPromo href={INSTALL_HREF} />
      </div>
    </main>
  )
}
