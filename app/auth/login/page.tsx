"use client"

import { Suspense, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
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

  useEffect(() => {
    const urlError = searchParams.get("error")
    const urlMessage = searchParams.get("message")
    if (urlError) {
      setSuccessMessage("")
      setError(
        urlError === "auth_callback_failed"
          ? "Sign-in link expired or could not be completed. Request a new reset email or try again."
          : urlError,
      )
    } else if (urlMessage) {
      setError("")
      setSuccessMessage(urlMessage)
    }
  }, [searchParams])

  const savePendingCard = async () => {
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
        const redirect = searchParams.get("redirect")
        router.push(redirect || "/dashboard")
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
          Welcome Back
        </h1>
        <p className="text-muted-foreground">
          Log in to manage your greeting cards
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
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
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
            ? "Logging in..."
            : hasPendingCard
              ? "Log In & Save Card"
              : "Log In"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={
            hasPendingCard
              ? "/auth/sign-up?redirect=/create&action=save"
              : "/auth/sign-up"
          }
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
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
