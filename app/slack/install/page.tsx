import { AppHeader } from "@/components/app-header"

export default function SlackInstallPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-8 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Add CardsAI to Slack
          </h1>
          <p className="text-muted-foreground">
            Create personalised AI greeting cards directly from Slack using{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-sm">
              /cardsai
            </code>
            .
          </p>
        </div>

        <ul className="w-full space-y-2 text-left text-sm text-muted-foreground">
          {[
            "Use /cardsai to open a card creation form",
            "Choose card type, recipient, tone, and context",
            "AI generates a personalised headline and image",
            "Card link delivered directly in Slack",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-foreground">✓</span>
              {item}
            </li>
          ))}
        </ul>

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

        <p className="text-xs text-muted-foreground">
          After installing, use{" "}
          <code className="rounded bg-muted px-1 py-0.5">/cardsai-link</code> to
          connect your CardsAI account.
        </p>
      </main>
    </div>
  )
}
