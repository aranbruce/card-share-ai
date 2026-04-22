"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Card3D } from "@/components/card-3d"
import { forCardDisplay, type Contribution } from "@/lib/card-body"
import { Logo } from "@/components/logo"

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

  const guestMessageCount = useMemo(
    () => contributions.filter((c) => !c.is_creator).length,
    [contributions],
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
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm text-muted-foreground">
              A special card for
            </p>
            <h1 className="mb-2 text-3xl font-bold">{card.recipient_name}</h1>
            <p className="text-muted-foreground">
              Click the card to open it and read your messages
            </p>
          </div>

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

          {guestMessageCount > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                This card contains {guestMessageCount} special{" "}
                {guestMessageCount === 1 ? "message" : "messages"} from loved
                ones
              </p>
            </div>
          )}

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
