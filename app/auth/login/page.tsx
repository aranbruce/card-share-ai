"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAuthSessionMissingError } from "@supabase/supabase-js"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import {
  isOAuthProviderId,
  oauthProviderLabel,
  type OAuthProviderId,
} from "@/lib/oauth-auth"
import { resolveSafePostAuthRedirectPath } from "@/lib/safe-redirect-path"
import {
  hasPendingCard as checkHasPendingCard,
  loadPendingCard,
  clearPendingCard,
} from "@/lib/pending-card-storage"
import { apiPost } from "@/lib/api-client"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const urlError = searchParams.get("error")
  const urlMessage = searchParams.get("message")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(
    urlError === "auth_callback_failed"
      ? "Sign-in link expired or could not be completed. Request a new reset email or try again."
      : (urlError ?? ""),
  )
  const successMessage = !urlError && urlMessage ? urlMessage : ""
  const [loading, setLoading] = useState(false)
  const [hasPendingCard] = useState(() => {
    if (typeof window === "undefined") return false
    return checkHasPendingCard()
  })

  const savePendingCard = useCallback(async () => {
    const cardData = loadPendingCard()
    if (!cardData) return null
    try {
      const { card } = await apiPost<{ card: { id: string } }>(
        "/api/cards",
        cardData,
      )
      clearPendingCard()
      return card.id
    } catch (err) {
      console.error("Error saving pending card:", err)
      return null
    }
  }, [])

  useEffect(() => {
    const oauthParam = searchParams.get("oauth")
    if (!isOAuthProviderId(oauthParam)) return

    let cancelled = false

    const completeOAuthLogin = async () => {
      setLoading(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !user) {
        setLoading(false)
        if (!isAuthSessionMissingError(userError)) {
          setError(
            userError?.message ??
              `Could not complete ${oauthProviderLabel(oauthParam)} login.`,
          )
        }
        return
      }

      const savedCardId = await savePendingCard()
      if (cancelled) return

      if (savedCardId) {
        router.replace(`/dashboard/cards/${savedCardId}`)
        return
      }

      const redirect = resolveSafePostAuthRedirectPath(
        searchParams.get("redirect"),
      )
      router.replace(redirect)
    }

    void completeOAuthLogin()

    return () => {
      cancelled = true
    }
  }, [router, savePendingCard, searchParams, supabase])

  const startOAuthLogin = async (provider: OAuthProviderId) => {
    setLoading(true)
    setError("")

    const redirect = resolveSafePostAuthRedirectPath(
      searchParams.get("redirect"),
    )
    const action = searchParams.get("action")
    const nextParams = new URLSearchParams({ oauth: provider, redirect })
    if (action) nextParams.set("action", action)

    const callbackUrl = new URL("/auth/callback", window.location.origin)
    callbackUrl.searchParams.set("next", `/auth/login?${nextParams.toString()}`)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl.toString() },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

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
        const redirect = resolveSafePostAuthRedirectPath(
          searchParams.get("redirect"),
        )
        router.push(redirect)
      }
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="mb-1.5 text-3xl font-semibold tracking-[-0.025em]">
          Welcome back.
        </h1>
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href={
              hasPendingCard
                ? "/auth/sign-up?redirect=/create&action=save"
                : "/auth/sign-up"
            }
            className="font-medium text-brand hover:underline"
          >
            Create an account
          </Link>
          .
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
          {successMessage}
        </div>
      )}

      {hasPendingCard && (
        <Alert className="mb-6">
          <AlertTitle>Your card is ready!</AlertTitle>
          <AlertDescription>Sign in to save it.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => void startOAuthLogin("google")}
          disabled={loading}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          onClick={() => void startOAuthLogin("github")}
          disabled={loading}
        >
          Continue with GitHub
        </Button>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-brand hover:underline"
            >
              Forgot?
            </Link>
          </div>
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
          variant="brand"
          size="lg"
          fullWidth
          className="mt-4"
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : hasPendingCard
              ? "Sign in & save card"
              : "Sign in"}
        </Button>
      </form>
    </>
  )
}

export default function Login() {
  return (
    <Suspense
      fallback={<p className="text-center text-muted-foreground">Loading…</p>}
    >
      <LoginForm />
    </Suspense>
  )
}
