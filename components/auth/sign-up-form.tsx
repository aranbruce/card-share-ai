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
import { friendlyAuthError } from "@/lib/auth-errors"
import type { OAuthProviderId } from "@/lib/oauth-auth"
import { usePendingSaveIntent } from "@/hooks/use-pending-save-intent"
import {
  buildSignUpEmailRedirectTo,
  rememberSignUpEmail,
} from "@/lib/auth/sign-up-email"
import {
  persistPendingCardAfterAuth,
  persistPendingCardErrorMessage,
} from "@/lib/persist-pending-card-after-auth"
import { captureAuthEvent } from "@/lib/posthog-client"
import { startOAuthSignIn } from "@/lib/auth/oauth-sign-in"
import { useOAuthReturn } from "@/lib/auth/use-oauth-return"

function SignUpFormInner() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasPendingCard = usePendingSaveIntent(searchParams)
  const [supabase] = useState(() => createClient())

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
    returnPath: "/sign-up",
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
      "/sign-up",
      provider,
      searchParams,
    )

    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildSignUpEmailRedirectTo(window.location.origin),
        },
      })

      if (signUpError) {
        setError(friendlyAuthError(signUpError.message, signUpError.status))
        setLoading(false)
        return
      }

      // An empty identities array means the email is already registered
      // (Supabase obfuscates this), so it isn't a new sign-up.
      const isNewUser = (data.user?.identities?.length ?? 0) > 0

      // A session is only returned when email confirmation is disabled.
      // Otherwise the user must confirm their email before signing in.
      if (data.user && data.session) {
        if (isNewUser) {
          captureAuthEvent(
            "user_signed_up",
            { provider: "email" },
            { id: data.user.id, email: data.user.email },
          )
        }

        const { cardId, error: persistError } = await tryPersistPendingCard()

        if (cardId) {
          router.push(`/dashboard/cards/${cardId}`)
        } else if (persistError) {
          setError(persistError)
          setLoading(false)
          router.push("/create?action=save")
        } else {
          router.push("/dashboard")
        }
      } else {
        if (data.user && isNewUser) {
          captureAuthEvent(
            "user_signed_up",
            {
              provider: "email",
              email_confirmation_required: true,
            },
            { id: data.user.id, email: data.user.email },
          )
        }
        // Also remembered for already-registered emails, so the page doesn't
        // reveal which addresses have accounts.
        rememberSignUpEmail(email)
        router.push("/sign-up-success")
      }
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <>
      <AuthPageHeader
        title="Create an account"
        description={
          <>
            Already have one?{" "}
            <Link
              href={
                hasPendingCard
                  ? "/login?redirect=/create&action=save"
                  : "/login"
              }
              className="font-medium text-brand hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      />

      {hasPendingCard ? (
        <Alert className="mb-6">
          <AlertTitle>Your card is ready!</AlertTitle>
          <AlertDescription>Create an account to save it.</AlertDescription>
        </Alert>
      ) : null}

      <AuthOAuthButtons
        disabled={loading}
        onProviderClick={(provider) => void handleOAuthClick(provider)}
      />

      <form onSubmit={handleSignUp} className="space-y-4">
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
              ? "Sign up & save card"
              : "Create account"}
        </Button>
      </form>
    </>
  )
}

export function SignUpForm() {
  return (
    <Suspense
      fallback={<p className="text-center text-muted-foreground">Loading…</p>}
    >
      <SignUpFormInner />
    </Suspense>
  )
}
