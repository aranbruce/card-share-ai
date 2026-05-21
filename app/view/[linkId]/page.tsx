"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card3D } from "@/components/card-3d"
import { forCardDisplay, type Contribution } from "@/lib/card-body"
import Link from "next/link"
import { FileX2 } from "lucide-react"

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
      setLoading(true)
      setError("")
      setCard(null)
      try {
        const response = await fetch(`/api/cards/view/${linkId}`)

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || "Card not found")
          return
        }

        const { card: cardData, contributions: fetchedContributions } =
          await response.json()
        setCard(cardData)
        setContributions(fetchedContributions)
      } catch (err) {
        console.error("Error loading card:", err)
        setError("Failed to load card")
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
      <main className="flex-1 p-4 pt-8 md:p-8 md:pt-12">
        <div className="mx-auto max-w-2xl">
          <section className="mb-8 space-y-3 text-center">
            <Skeleton className="mx-auto h-3 w-40 rounded-sm" />
            <Skeleton className="mx-auto h-12 w-56 rounded-md" />
            <Skeleton className="mx-auto h-4 w-64 rounded-sm" />
          </section>
          <Skeleton className="card-cover-skeleton mx-auto max-w-md" />
          <div className="mt-8 flex justify-center">
            <Skeleton className="h-12 w-52 rounded-xl" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !card) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileX2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Card not found
            </h1>
            <p className="max-w-xs text-sm text-muted-foreground">
              {error ||
                "This card may have been deleted or the link may be invalid."}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/auth/sign-up">Create your own card</Link>
        </Button>
      </main>
    )
  }

  return (
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
            <Link href="/auth/sign-up">Create your own card</Link>
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">Created with CardsAI</p>
        </div>
      </div>
    </main>
  )
}
