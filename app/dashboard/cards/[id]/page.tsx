"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"
import { ShareModal } from "@/components/share-modal"
import { CardOwnerStudio } from "@/components/card-owner-studio"
import { ArrowLeft, Send, Copy, CheckCircle2, X, Sparkles } from "lucide-react"
import { Logo } from "@/components/logo"

interface CardData {
  id: string
  recipient_name: string
  recipient_email?: string
  sender_name: string
  copy_headline: string
  copy_message: string
  copy_signoff?: string
  image_url: string
  sent_at?: string | null
  contributor_link_id: string
}

function CardDetailInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cardId = params.id as string

  const supabase = useMemo(() => createClient(), [])
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copyLinkCopied, setCopyLinkCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(false)

  const welcomeParam = searchParams.get("welcome") === "1"
  const needsOwnerMessage = !card?.copy_message?.trim()
  const welcomeActive = welcomeParam && !welcomeBannerDismissed
  const showWelcomeBanner = welcomeActive && needsOwnerMessage
  const prioritizeFirstOwnerMessage = showWelcomeBanner
  /** Stay on the inside spread while the welcome URL flag is active (even after saving). */
  const initialCardPage = welcomeActive ? 1 : 0

  const dismissWelcome = useCallback(() => {
    setWelcomeBannerDismissed(true)
    router.replace(`/dashboard/cards/${cardId}`, { scroll: false })
  }, [router, cardId])

  const loadCard = useCallback(async () => {
    try {
      const response = await fetch(`/api/cards/${cardId}`)
      if (!response.ok) throw new Error("Card not found")

      const { card: cardData } = await response.json()
      setCard(cardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load card")
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      void loadCard()
    }

    void checkAuth()
  }, [router, supabase, loadCard])

  const copyContributorLink = () => {
    if (!card) return

    const link = `${window.location.origin}/contribute/${card.contributor_link_id}`
    navigator.clipboard.writeText(link)
    setCopyLinkCopied(true)
    setTimeout(() => setCopyLinkCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Card Not Found</h1>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20 pb-20">
      <header className="flex items-center justify-center py-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-2 md:px-8 lg:py-4">
        {error && (
          <div className="mb-8 rounded-4xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {showWelcomeBanner ? (
          <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5 pr-2">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Add your message
              </p>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/90">
                You&apos;re on the inside of the card—click a page to place your
                note, the same way guests will. Use the contributor link below
                when you&apos;re ready to invite others.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 self-end text-muted-foreground hover:bg-primary/10 hover:text-foreground sm:self-start"
              onClick={dismissWelcome}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div className="mx-auto max-w-2xl space-y-12">
          <div className="space-y-8">
            <div className="space-y-3 text-center">
              <div className="relative flex items-center justify-center">
                <Link
                  href="/dashboard"
                  className="group absolute left-0 shrink-0 rounded-full bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Back to Dashboard"
                  aria-label="Back to Dashboard"
                >
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Card for {card.recipient_name}
                </h1>
              </div>
              <p className="flex items-center justify-center gap-2 text-base text-muted-foreground">
                <span>
                  From{" "}
                  <span className="font-medium text-foreground">
                    {card.sender_name}
                  </span>
                </span>
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Edit the cover, your personal note, and layout below. Guests can
                add their messages using the contributor link.
              </p>
            </div>

            <div className="relative flex justify-center">
              <CardOwnerStudio
                key={`${cardId}-${card.recipient_email || ""}`}
                cardId={cardId}
                initialCardPage={initialCardPage}
                prioritizeFirstOwnerMessage={prioritizeFirstOwnerMessage}
                onOwnerComposeSaved={() => {
                  void loadCard()
                }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 border-t border-border/50 pt-8 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              className="hover:bg-secondary/50 sm:w-auto"
              onClick={copyContributorLink}
            >
              {copyLinkCopied ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
              ) : (
                <Copy className="mr-2 h-5 w-5" />
              )}
              {copyLinkCopied ? "Link Copied!" : "Copy Share Link"}
            </Button>

            <Button
              size="lg"
              fullWidth
              className="transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
              onClick={() => setShowShareModal(true)}
            >
              <Send className="mr-2 h-5 w-5" />
              Send to Recipient
            </Button>
          </div>
        </div>

        <ShareModal
          cardId={cardId}
          recipientName={card.recipient_name}
          recipientEmail={card.recipient_email || ""}
          contributorLinkId={card.contributor_link_id}
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            void loadCard()
          }}
          onEmailUpdate={(email) => {
            setCard((prev) =>
              prev ? { ...prev, recipient_email: email } : null,
            )
          }}
          onSentAtRecorded={(sentAt) => {
            setCard((prev) => (prev ? { ...prev, sent_at: sentAt } : null))
          }}
        />
      </main>
    </div>
  )
}

export default function CardDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <CardDetailInner />
    </Suspense>
  )
}
