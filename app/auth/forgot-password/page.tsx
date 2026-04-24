"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { friendlyAuthError } from "@/lib/auth-errors"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
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
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
            Check Your Email
          </h1>
          <p className="text-muted-foreground">
            We&apos;ve sent you a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Click the link in the email to reset your password. The link will
          expire in 1 hour.
        </p>
        <Button
          asChild
          variant="outline"
          size="lg"
          fullWidth
          className="mt-4 border-border/50 hover:bg-secondary/50"
        >
          <Link href="/auth/login">Back to Login</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
          Reset Password
        </h1>
        <p className="text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </p>
      </div>

      <form onSubmit={handleResetRequest} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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

        <Button
          type="submit"
          size="lg"
          fullWidth
          className="mt-4"
          disabled={loading}
        >
          {loading ? "Sending reset link..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  )
}
