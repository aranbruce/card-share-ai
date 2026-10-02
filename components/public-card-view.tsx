"use client"

import { useEffect, useMemo, useState } from "react"
import posthog from "posthog-js"
import { Button } from "@/components/ui/button"
import { Card3D } from "@/components/card-3d"
import { CardBook3D } from "@/components/card-book-3d"
import {
  envelopeStyleForCard,
  type EnvelopeStyleId,
} from "@/components/card-book-3d/envelope-styles"
import { MessageFontVariables } from "@/components/message-font-variables"
import { forCardDisplay, type Contribution } from "@/lib/card-body"
import type { PublicCardViewRecord } from "@/lib/public-card-view"
import Link from "next/link"

/** How long the card shows its cover after leaving the envelope before it opens. */
const OPEN_INSIDE_DELAY_MS = 700

type PublicCardViewProps = {
  linkId: string
  card: PublicCardViewRecord
  contributions: Contribution[]
  /** Defaults to a style picked for this card (see `envelopeStyleForCard`). */
  envelopeStyle?: EnvelopeStyleId
}

export function PublicCardView({
  linkId,
  card,
  contributions,
  envelopeStyle,
}: PublicCardViewProps) {
  useEffect(() => {
    posthog.capture("card_viewed", {
      link_id: linkId,
      contribution_count: contributions.length,
    })
  }, [linkId, contributions.length])

  /** Once out of the envelope, the card opens itself after a beat on the cover. */
  const [openToPage, setOpenToPage] = useState<number>()
  const onOpened = () => {
    posthog.capture("card_opened", { link_id: linkId })
    window.setTimeout(() => setOpenToPage(1), OPEN_INSIDE_DELAY_MS)
  }

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
              Sent by {card.sender_name || "Someone special"}
            </p>
          </section>

          {/* The flat card shows only where the 3D card can't (no WebGL, or its code fails). */}
          <CardBook3D
            imageUrl={card.image_url}
            headline={card.copy_headline}
            message={bodyMessage}
            recipientName={card.recipient_name || "You"}
            contributions={displayContributions}
            extraPages={card.extra_pages || 0}
            envelope
            envelopeStyle={envelopeStyle ?? envelopeStyleForCard(linkId)}
            onEnvelopeOpened={onOpened}
            navigateToPage={openToPage}
            fallback={flatCard}
          />

          <div className="mt-8 flex justify-center">
            <Button variant="secondary" asChild>
              <Link href="/sign-up">Create your own card</Link>
            </Button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              Created with{" "}
              <Link href="/" className="underline-offset-2 hover:underline">
                CardShare.ai
              </Link>
            </p>
          </div>
        </div>
      </main>
    </MessageFontVariables>
  )
}
