'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

interface CardItem {
  id: string
  recipient_name: string
  sender_name: string
  card_type: string
  image_url: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Cards</h1>
          <div className="flex gap-3">
            <Link href="/create">
              <Button>Create Card</Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive mb-6">
            {error}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold mb-2">No cards yet</h2>
            <p className="text-muted-foreground mb-6 text-center">
              Create your first greeting card to get started
            </p>
            <Link href="/create">
              <Button size="lg">Create Your First Card</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <Link key={card.id} href={`/dashboard/cards/${card.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col cursor-pointer">
                  {card.image_url && (
                    <div className="relative w-full aspect-square bg-secondary overflow-hidden">
                      <Image
                        src={card.image_url}
                        alt={`${card.recipient_name}'s card`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        For: <span className="font-semibold text-foreground">{card.recipient_name}</span>
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        From: <span className="font-semibold text-foreground">{card.sender_name}</span>
                      </p>
                      <div className="inline-block px-2 py-1 bg-secondary rounded text-xs font-medium capitalize mb-3">
                        {card.card_type.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={card.status === 'draft' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault()
                        }}
                      >
                        {card.status === 'draft' ? 'Edit' : card.status === 'collecting' ? 'Managing' : 'View'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDeleteCard(card.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
