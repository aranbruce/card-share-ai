"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Card3D } from "@/components/card-3d"
import { forCardDisplay, type Contribution } from "@/lib/card-body"
import { Logo } from "@/components/logo"
import Link from "next/link"
import { Sparkles } from "lucide-react"

interface CardData {
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  extra_pages?: number
}

export default function PublicCardPage() {
  const params = useParams()
  const linkId = params.linkId as string

  const [card, setCard] = useState<CardData | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadCard = async () => {
      try {
        const response = await fetch(`/api/cards/view/${linkId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Card not found")
        }

        const { card: cardData, contributions: fetchedContributions } =
          await response.json()
        setCard(cardData)
        setContributions(fetchedContributions)
      } catch (err) {
        console.error("Error loading card:", err)
        setError(err instanceof Error ? err.message : "Failed to load card")
      } finally {
        setLoading(false)
      }
    }

    loadCard()
  }, [linkId])

  const { bodyMessage, displayContributions } = useMemo(
    () => forCardDisplay(contributions, card?.copy_message ?? ""),
    [contributions, card?.copy_message],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Card Not Found</h1>
          <p className="text-muted-foreground">
            {error || "The card could not be loaded"}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-center">
        <Logo />
      </header>
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

          <Card3D
            imageUrl={card.image_url}
            headline={card.copy_headline}
            message={bodyMessage}
            senderName={card.sender_name || "Someone special"}
            recipientName={card.recipient_name || "You"}
            contributions={displayContributions}
            extraPages={card.extra_pages || 0}
            hideEmptyCenterMessageBody={true}
          />

          <div className="mt-8 flex justify-center">
            <Button size="xl" asChild>
              <Link href="/auth/sign-up">
                <Sparkles />
                Create your own card
              </Link>
            </Button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              Created with CardsAI
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
