"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { friendlyAuthError } from "@/lib/auth-errors"

function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasPendingCard, setHasPendingCard] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check if there's a pending card
  useEffect(() => {
    const pendingCard = localStorage.getItem("pendingCard")
    setHasPendingCard(!!pendingCard)
  }, [])

  const savePendingCard = useCallback(async () => {
    const pendingCardData = localStorage.getItem("pendingCard")
    if (!pendingCardData) return null

    try {
      const cardData = JSON.parse(pendingCardData)
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData),
      })

      if (!response.ok) throw new Error("Failed to save card")

      const { card } = await response.json()
      localStorage.removeItem("pendingCard")
      return card.id || card
    } catch (err) {
      console.error("Error saving pending card:", err)
      return null
    }
  }, [])

  useEffect(() => {
    if (searchParams.get("oauth") !== "github") return

    let cancelled = false

    const completeOAuthSignUp = async () => {
      setLoading(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !user) {
        setError(userError?.message ?? "Could not complete GitHub sign up.")
        setLoading(false)
        return
      }

      const savedCardId = await savePendingCard()
      if (cancelled) return

      if (savedCardId) {
        router.replace(`/dashboard/cards/${savedCardId}`)
        return
      }

      const redirect = searchParams.get("redirect")
      router.replace(redirect || "/dashboard")
    }

    void completeOAuthSignUp()

    return () => {
      cancelled = true
    }
  }, [router, savePendingCard, searchParams, supabase])

  const handleGitHubSignUp = async () => {
    setLoading(true)
    setError("")

    const redirect = searchParams.get("redirect") || "/dashboard"
    const action = searchParams.get("action")
    const nextParams = new URLSearchParams({ oauth: "github", redirect })
    if (action) nextParams.set("action", action)

    const callbackUrl = new URL("/auth/callback", window.location.origin)
    callbackUrl.searchParams.set(
      "next",
      `/auth/sign-up?${nextParams.toString()}`,
    )

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: callbackUrl.toString() },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

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
          router.push("/dashboard")
        }
      } else {
        // Email confirmation required - store pending card info and redirect to success
        router.push("/auth/sign-up-success")
      }
    } catch {
      setError("An unexpected error occurred")
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
          <AlertDescription>Create an account to save it.</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        fullWidth
        onClick={handleGitHubSignUp}
        disabled={loading}
      >
        Continue with GitHub
      </Button>

      <div className="my-4 flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

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
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
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
          fullWidth
          className="mt-4"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : hasPendingCard
              ? "Sign Up & Save Card"
              : "Sign Up"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={
            hasPendingCard
              ? "/auth/login?redirect=/create&action=save"
              : "/auth/login"
          }
          className="font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  )
}

export default function SignUp() {
  return (
    <Suspense
      fallback={<p className="text-center text-muted-foreground">Loading…</p>}
    >
      <SignUpForm />
    </Suspense>
  )
}
