'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { friendlyAuthError } from '@/lib/auth-errors'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasPendingCard, setHasPendingCard] = useState(false)
  const router = useRouter()
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(friendlyAuthError(error.message, error.status))
        setLoading(false)
        return
      }

      // Check if email confirmation is required
      // If user.identities is empty, email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length > 0) {
        // User is auto-confirmed (dev mode or email confirmation disabled)
        // Try to save pending card
        const savedCardId = await savePendingCard()
        
        if (savedCardId) {
          router.push(`/dashboard/cards/${savedCardId}`)
        } else {
          router.push('/dashboard')
        }
      } else {
        // Email confirmation required - store pending card info and redirect to success
        router.push('/auth/sign-up-success')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 sm:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Create Account</h1>
          <p className="text-muted-foreground">
            Sign up to start creating virtual greeting cards
          </p>
        </div>

        {hasPendingCard && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded mb-6">
            <p className="text-sm text-center">
              Your card is ready! Create an account to save it.
            </p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
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
              className="h-12 bg-secondary/20 border-border/50 focus-visible:ring-1 mt-1"
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
              className="h-12 bg-secondary/20 border-border/50 focus-visible:ring-1 mt-1"
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-full text-base shadow-sm mt-4" disabled={loading}>
            {loading ? 'Creating account...' : hasPendingCard ? 'Sign Up & Save Card' : 'Sign Up'}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-8">
          Already have an account?{' '}
          <Link 
            href={hasPendingCard ? '/auth/login?redirect=/create&action=save' : '/auth/login'} 
            className="text-primary hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
