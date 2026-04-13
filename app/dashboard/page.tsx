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
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading your cards...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50 h-16 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-4 md:px-8 flex justify-between items-center">
          <Logo />
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground font-medium" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 lg:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">My Cards</h1>
            <p className="text-muted-foreground mt-2">Manage and view your generated greeting cards.</p>
          </div>
          
          {cards.length > 0 && (
            <Link href="/create" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full shadow-sm font-semibold px-6 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                Create New Card
              </Button>
            </Link>
          )}
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive mb-6">
            {error}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3 tracking-tight">No cards yet</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t created any greeting cards. Start creating your first beautiful, AI-generated card today.
            </p>
            <Link href="/create">
              <Button size="lg" className="h-12 px-8 rounded-full shadow-sm">Create Your First Card</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cards.map((card) => (
              <div key={card.id} className="group relative flex flex-col h-full">
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="absolute inset-0 z-0 rounded-3xl"
                  aria-label={`View card for ${card.recipient_name}`}
                />
                <Card className="relative z-10 pointer-events-none overflow-hidden hover:shadow-xl hover:shadow-black/5 transition-all hover:-translate-y-1 duration-300 h-full flex flex-col py-0 border-border/60 rounded-3xl bg-background shadow-sm">
                  <div className="relative w-full aspect-4/3 shrink-0 bg-secondary overflow-hidden">
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
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-black/60 backdrop-blur-md text-white shadow-sm">
                        {card.card_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="mb-8">
                      <h3 className="font-bold text-xl text-foreground tracking-tight mb-1.5">
                        For {card.recipient_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        From {card.sender_name}
                      </p>
                    </div>

                    <div className="flex gap-3 pointer-events-auto">
                      <Button
                        className="flex-1 rounded-full font-semibold shadow-sm h-10"
                        type="button"
                        onClick={() => router.push(`/dashboard/cards/${card.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        className="rounded-full shadow-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors px-6 font-semibold h-10 border-border/80"
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
