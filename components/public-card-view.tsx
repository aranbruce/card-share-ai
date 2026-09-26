"use client"

import { useEffect, useMemo, useState } from "react"
import posthog from "posthog-js"
import { Button } from "@/components/ui/button"
import { Card3D } from "@/components/card-3d"
import { CardBook3D } from "@/components/card-book-3d"
import { MessageFontVariables } from "@/components/message-font-variables"
import { forCardDisplay, type Contribution } from "@/lib/card-body"
import type { PublicCardViewRecord } from "@/lib/public-card-view"
import Link from "next/link"

type PublicCardViewProps = {
  linkId: string
  card: PublicCardViewRecord
  contributions: Contribution[]
}

export function PublicCardView({
  linkId,
  card,
  contributions,
}: PublicCardViewProps) {
  useEffect(() => {
    posthog.capture("card_viewed", {
      link_id: linkId,
      contribution_count: contributions.length,
    })
  }, [linkId, contributions.length])

  const [view, setView] = useState<"3d" | "flat">("3d")

  const { bodyMessage, displayContributions } = useMemo(
    () => forCardDisplay(contributions, card.copy_message ?? ""),
    [contributions, card.copy_message],
  )

  const flatCard = (
    <Card3D
      imageUrl={card.image_url}
      headline={card.copy_headline}
      message={bodyMessage}
      recipientName={card.recipient_name || "You"}
      contributions={displayContributions}
      extraPages={card.extra_pages || 0}
    />
  )

  return (
    <MessageFontVariables className="flex flex-1 flex-col">
      <main className="flex-1 p-4 pt-8 md:p-8 md:pt-12">
        <div className="mx-auto max-w-2xl">
          <section className="mb-8 text-center">
            <p className="mb-3 font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
              A card arrived for you
            </p>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
              {card.recipient_name}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sent by {card.sender_name || "Someone special"} · received today
            </p>
          </section>

          <div className="mb-4 flex justify-center">
            <div
              role="group"
              aria-label="Card view"
              className="inline-flex rounded-full border border-border p-0.5 text-xs"
            >
              {(["3d", "flat"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    view === option
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option === "3d" ? "3D" : "Flat"}
                </button>
              ))}
            </div>
          </div>

          {view === "3d" ? (
            <CardBook3D
              imageUrl={card.image_url}
              headline={card.copy_headline}
              message={bodyMessage}
              recipientName={card.recipient_name || "You"}
              contributions={displayContributions}
              extraPages={card.extra_pages || 0}
              fallback={flatCard}
            />
          ) : (
            flatCard
          )}

          <div className="mt-8 flex justify-center">
            <Button size="xl" asChild>
              <Link href="/sign-up">Create your own card</Link>
            </Button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              Created with cardshareAI
            </p>
          </div>
        </div>
      </main>
    </MessageFontVariables>
  )
}
