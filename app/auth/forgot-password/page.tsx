'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { friendlyAuthError } from '@/lib/auth-errors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Must hit /auth/recovery-callback so PKCE is exchanged and session cookies are set on the response.
        // Path-only URL keeps PKCE redirect_uri aligned with Supabase allowlist entries.
        redirectTo: `${window.location.origin}/auth/recovery-callback`,
      })

      if (error) {
        setError(friendlyAuthError(error.message, error.status))
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Check Your Email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent you a password reset link to{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <p className="text-sm text-center text-muted-foreground mb-8">
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full h-12 rounded-full text-base shadow-sm border-border/50 hover:bg-secondary/50">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 sm:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleResetRequest} className="space-y-4">
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

          <Button type="submit" className="w-full h-12 rounded-full text-base shadow-sm mt-4" disabled={loading}>
            {loading ? 'Sending reset link...' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-8">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
