'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import { Inbox } from 'lucide-react'
import { Logo } from '@/components/logo'

interface CardItem {
  id: string
  recipient_name: string
  sender_name: string
  card_type: string
  image_url: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      loadCards()
    }

    checkAuth()
  }, [router, supabase])

  const loadCards = async () => {
    try {
      const response = await fetch('/api/cards')
      if (!response.ok) throw new Error('Failed to load cards')

      const { cards: cardData } = await response.json()
      setCards(cardData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete card')

      setCards(cards.filter((c) => c.id !== cardId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="animate-pulse text-sm font-medium text-muted-foreground">
          Loading your cards...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <Logo />
          <Button
            variant="ghost"
            size="sm"
            className="font-medium text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:py-12">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              My Cards
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage and view your generated greeting cards.
            </p>
          </div>

          {cards.length > 0 && (
            <Link href="/create" className="w-full sm:w-auto">
              <Button
                size="lg"
                fullWidth
                className="font-semibold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
              >
                Create New Card
              </Button>
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">
              No cards yet
            </h2>
            <p className="mx-auto mb-8 max-w-sm leading-relaxed text-muted-foreground">
              You haven&apos;t created any greeting cards. Start creating your
              first beautiful, AI-generated card today.
            </p>
            <Link href="/create">
              <Button size="lg">Create Your First Card</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="group relative flex h-full flex-col"
              >
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="absolute inset-0 z-0 rounded-2xl"
                  aria-label={`View card for ${card.recipient_name}`}
                />
                <Card className="pointer-events-none relative z-10 flex h-full flex-col overflow-hidden border-border/60 bg-background py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
                  <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-secondary">
                    {card.image_url && (
                      <Image
                        src={card.image_url}
                        alt={`${card.recipient_name}'s card`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    )}

                    {/* Floating badge */}
                    <div className="absolute top-4 left-4 z-20">
                      <div className="inline-flex items-center rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white uppercase shadow-sm backdrop-blur-md">
                        {card.card_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div className="mb-8">
                      <h3 className="mb-1.5 text-xl font-bold tracking-tight text-foreground">
                        For {card.recipient_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        From {card.sender_name}
                      </p>
                    </div>

                    <div className="pointer-events-auto flex gap-3">
                      <Button
                        className="flex-1 font-semibold shadow-sm"
                        type="button"
                        size="lg"
                        onClick={() =>
                          router.push(`/dashboard/cards/${card.id}`)
                        }
                      >
                        Open
                      </Button>
                      <Button
                        variant="destructive"
                        type="button"
                        size="lg"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
