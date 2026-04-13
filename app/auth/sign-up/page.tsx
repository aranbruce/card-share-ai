'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length > 0
      ) {
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
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Sign up to start creating virtual greeting cards
          </p>
        </div>

        {hasPendingCard && (
          <Alert className="mb-6">
            <AlertTitle>Your card is ready!</AlertTitle>
            <AlertDescription>
              Create an account to save it.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          {error && (
            <div className="rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
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
              variant="auth"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
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
              variant="auth"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : hasPendingCard
                ? 'Sign Up & Save Card'
                : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href={
              hasPendingCard
                ? '/auth/login?redirect=/create&action=save'
                : '/auth/login'
            }
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
    </>
  )
}
