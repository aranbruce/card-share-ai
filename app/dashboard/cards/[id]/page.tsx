'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { ShareModal } from '@/components/share-modal'
import { CardOwnerStudio } from '@/components/card-owner-studio'
import { ArrowLeft, Send, Copy, CheckCircle2, X, Sparkles, Mail, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

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
  const [error, setError] = useState('')
  const [copyLinkCopied, setCopyLinkCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(false)

  const welcomeParam = searchParams.get('welcome') === '1'
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
      if (!response.ok) throw new Error('Card not found')

      const { card: cardData } = await response.json()
      setCard(cardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load card')
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
        router.push('/auth/login')
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      <header className="py-6 flex items-center justify-center">
        <Logo />
      </header>
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-2 lg:py-4">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive mb-8">
            {error}
          </div>
        )}

        {showWelcomeBanner ? (
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 shadow-sm">
            <div className="space-y-1.5 pr-2">
              <p className="font-semibold text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Add your message
              </p>
              <p className="text-sm text-muted-foreground/90 max-w-2xl leading-relaxed">
                You&apos;re on the inside of the card—click a page to place your note,
                the same way guests will. Use the contributor link below when
                you&apos;re ready to invite others.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 self-end sm:self-start rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10"
              onClick={dismissWelcome}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div className="max-w-2xl mx-auto space-y-12">
          <div className="space-y-8">
            <div className="space-y-3 text-center">
              <div className="relative flex items-center justify-center">
                <Link 
                  href="/dashboard" 
                  className="absolute left-0 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground group shrink-0" 
                  title="Back to Dashboard"
                  aria-label="Back to Dashboard"
                >
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                </Link>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Card for {card.recipient_name}
                </h1>
              </div>
              <p className="text-base text-muted-foreground flex items-center justify-center gap-2">
                <span>From <span className="font-medium text-foreground">{card.sender_name}</span></span>
              </p>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed mt-2">
                Edit the cover, your personal note, and layout below. Guests can add their messages using the contributor link.
              </p>
            </div>

            <div className="relative flex justify-center">
              <CardOwnerStudio
                key={`${cardId}-${card.recipient_email || ''}`}
                cardId={cardId}
                initialCardPage={initialCardPage}
                prioritizeFirstOwnerMessage={prioritizeFirstOwnerMessage}
                onOwnerComposeSaved={() => {
                  void loadCard()
                }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 border-t border-border/50">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-2xl h-14 px-8 text-base font-semibold shadow-sm bg-background hover:bg-secondary/50"
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
              className="w-full sm:w-auto rounded-2xl h-14 px-8 text-base font-semibold shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
          recipientEmail={card.recipient_email || ''}
          contributorLinkId={card.contributor_link_id}
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            void loadCard()
          }}
          onEmailUpdate={(email) => {
            setCard((prev) => (prev ? { ...prev, recipient_email: email } : null))
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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <CardDetailInner />
    </Suspense>
  )
}
