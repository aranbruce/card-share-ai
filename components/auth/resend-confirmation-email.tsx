"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { friendlyAuthError } from "@/lib/auth-errors"
import {
  buildSignUpEmailRedirectTo,
  parseSignUpEmail,
  readSignUpEmailRaw,
  rememberSignUpEmail,
  secondsUntilResend,
  subscribeSignUpEmail,
} from "@/lib/auth/sign-up-email"
import { createClient } from "@/lib/supabase/client"

export function ResendConfirmationEmail() {
  const raw = useSyncExternalStore(
    subscribeSignUpEmail,
    readSignUpEmailRaw,
    () => null,
  )
  const stored = useMemo(() => parseSignUpEmail(raw), [raw])

  const [supabase] = useState(() => createClient())
  const [now, setNow] = useState(() => Date.now())
  const [sending, setSending] = useState(false)
  // Only for the copy; the send time itself lives in storage.
  const [resent, setResent] = useState(false)
  const [error, setError] = useState("")

  // secondsUntilResend clamps to the full cooldown, so a fresh sentAt that is
  // ahead of `now` starts the countdown immediately.
  const remaining = stored ? secondsUntilResend(stored.sentAt, now) : 0
  const counting = remaining > 0

  useEffect(() => {
    if (!counting) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [counting])

  if (!stored) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        Wrong address or no email?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-brand hover:underline"
        >
          Sign up again
        </Link>
      </p>
    )
  }

  const handleResend = async () => {
    setSending(true)
    setError("")

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: stored.email,
        options: {
          emailRedirectTo: buildSignUpEmailRedirectTo(window.location.origin),
        },
      })
      if (resendError) {
        setError(friendlyAuthError(resendError.message, resendError.status))
        return
      }
      rememberSignUpEmail(stored.email)
      setResent(true)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mb-6 space-y-2">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {resent ? "Sent another email to " : "Sent to "}
        <span className="font-medium text-foreground">{stored.email}</span>
      </p>
      {error ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        fullWidth
        disabled={counting || sending}
        onClick={() => void handleResend()}
      >
        {sending
          ? "Sending…"
          : counting
            ? `Resend email in ${remaining}s`
            : "Resend email"}
      </Button>
    </div>
  )
}
