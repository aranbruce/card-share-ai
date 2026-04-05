'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasPendingCard, setHasPendingCard] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check if there's a pending card
  useEffect(() => {
    const pendingCard = localStorage.getItem('pendingCard')
    setHasPendingCard(!!pendingCard)
  }, [])

  const savePendingCard = async () => {
    const pendingCardData = localStorage.getItem('pendingCard')
    if (!pendingCardData) return null

    try {
      const cardData = JSON.parse(pendingCardData)
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      })

      if (!response.ok) throw new Error('Failed to save card')

      const { card } = await response.json()
      localStorage.removeItem('pendingCard')
      return card.id || card
    } catch (err) {
      console.error('Error saving pending card:', err)
      return null
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Check for pending card and save it
      const savedCardId = await savePendingCard()
      
      if (savedCardId) {
        // Redirect to the saved card
        router.push(`/dashboard/cards/${savedCardId}`)
      } else {
        // Normal redirect
        const redirect = searchParams.get('redirect')
        router.push(redirect || '/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground mb-6">
          Log in to manage your greeting cards
        </p>

        {hasPendingCard && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded mb-6">
            <p className="text-sm text-center">
              Your card is ready! Sign in to save it.
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : hasPendingCard ? 'Log In & Save Card' : 'Log In'}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link 
            href={hasPendingCard ? '/auth/sign-up?redirect=/create&action=save' : '/auth/sign-up'} 
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  )
}
