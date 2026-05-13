"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { AppHeader } from "@/components/app-header"

function InstalledContent() {
  const searchParams = useSearchParams()
  const team = searchParams.get("team")
  const error = searchParams.get("error")

  if (error) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          CardsAI couldn&apos;t be added to your workspace. Please try again.
        </p>
        <a
          href="/slack/install"
          className="text-sm font-medium underline underline-offset-4"
        >
          Try again
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        CardsAI added{team ? ` to ${team}` : ""}!
      </h1>
      <p className="text-muted-foreground">
        Use{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">
          /cardsai-link
        </code>{" "}
        to connect your CardsAI account, then{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">/cardsai</code>{" "}
        to create your first card.
      </p>
      <div className="flex flex-col items-center gap-2">
        <a
          href="slack://open"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open Slack
        </a>
        <a
          href="https://app.slack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          Open in browser instead
        </a>
      </div>
    </main>
  )
}

export default function SlackInstalledPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Suspense fallback={null}>
        <InstalledContent />
      </Suspense>
    </div>
  )
}
