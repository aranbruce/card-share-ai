"use client"

import { Suspense, useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthPageHeader } from "@/components/auth/page-header"
import { AuthOAuthButtons } from "@/components/auth/oauth-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import type { OAuthProviderId } from "@/lib/oauth-auth"
import { resolveSafePostAuthRedirectPath } from "@/lib/safe-redirect-path"
import { usePendingSaveIntent } from "@/hooks/use-pending-save-intent"
import {
  persistPendingCardAfterAuth,
  persistPendingCardErrorMessage,
} from "@/lib/persist-pending-card-after-auth"
import { captureAuthEvent } from "@/lib/posthog-client"
import { startOAuthSignIn } from "@/lib/auth/oauth-sign-in"
import { useOAuthReturn } from "@/lib/auth/use-oauth-return"

function LoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())

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
  const hasPendingCard = usePendingSaveIntent(searchParams)

  const tryPersistPendingCard = useCallback(async () => {
    const result = await persistPendingCardAfterAuth(supabase)
    if (result.ok)
      return { cardId: result.cardId, error: null as string | null }
    if (result.reason === "none") {
      return { cardId: null as string | null, error: null as string | null }
    }
    return {
      cardId: null as string | null,
      error: persistPendingCardErrorMessage(result),
    }
  }, [supabase])

  useOAuthReturn({
    returnPath: "/login",
    supabase,
    searchParams,
    router,
    hasPendingCard,
    tryPersistPendingCard,
    setLoading,
    setError,
  })

  const handleOAuthClick = async (provider: OAuthProviderId) => {
    setLoading(true)
    setError("")

    const { error: oauthError } = await startOAuthSignIn(
      supabase,
      "/login",
      provider,
      searchParams,
    )

    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      const { cardId, error: persistError } = await tryPersistPendingCard()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        captureAuthEvent("user_logged_in", { provider: "email" }, user)
      }

      if (cardId) {
        router.push(`/dashboard/cards/${cardId}`)
      } else if (persistError) {
        setError(persistError)
        setLoading(false)
        router.push("/create?action=save")
      } else {
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
      <AuthPageHeader
        title="Welcome back"
        description={
          <>
            New here?{" "}
            <Link
              href={
                hasPendingCard
                  ? "/sign-up?redirect=/create&action=save"
                  : "/sign-up"
              }
              className="font-medium text-brand hover:underline"
            >
              Create an account
            </Link>
          </>
        }
      />

      {successMessage ? (
        <div className="mb-6 rounded border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
          {successMessage}
        </div>
      ) : null}

      {hasPendingCard ? (
        <Alert className="mb-6">
          <AlertTitle>Your card is ready!</AlertTitle>
          <AlertDescription>Sign in to save it.</AlertDescription>
        </Alert>
      ) : null}

      <AuthOAuthButtons
        disabled={loading}
        onProviderClick={(provider) => void handleOAuthClick(provider)}
      />

      <form onSubmit={handleLogin} className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

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
              href="/forgot-password"
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

export function LoginForm() {
  return (
    <Suspense
      fallback={<p className="text-center text-muted-foreground">Loading…</p>}
    >
      <LoginFormInner />
    </Suspense>
  )
}
