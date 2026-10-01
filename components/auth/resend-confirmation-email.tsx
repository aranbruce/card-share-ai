"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { friendlyAuthError } from "@/lib/auth-errors"
import {
  buildSignUpEmailRedirectTo,
  parseSignUpEmail,
  readSignUpEmailRaw,
  rememberSignUpEmail,
  secondsUntilResend,
} from "@/lib/auth/sign-up-email"
import { createClient } from "@/lib/supabase/client"

// sessionStorage doesn't notify the same tab, and this component writes its own
// updates to state, so there is nothing to subscribe to.
function subscribeNoop() {
  return () => {}
}

export function ResendConfirmationEmail() {
  const raw = useSyncExternalStore(
    subscribeNoop,
    readSignUpEmailRaw,
    () => null,
  )
  const stored = useMemo(() => parseSignUpEmail(raw), [raw])

  const [supabase] = useState(() => createClient())
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [sending, setSending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState("")

  const sentAt = resentAt ?? stored?.sentAt
  const remaining = sentAt === undefined ? 0 : secondsUntilResend(sentAt, now)
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

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: stored.email,
      options: {
        emailRedirectTo: buildSignUpEmailRedirectTo(window.location.origin),
      },
    })

    setSending(false)
    if (resendError) {
      setError(friendlyAuthError(resendError.message, resendError.status))
      return
    }

    const sentNow = Date.now()
    rememberSignUpEmail(stored.email, sentNow)
    setResentAt(sentNow)
    setNow(sentNow)
    setResent(true)
  }

  return (
    <div className="mb-6 space-y-2">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <>
            {resent ? "Sent another email to " : "Sent to "}
            <span className="font-medium text-foreground">{stored.email}</span>
          </>
        )}
      </p>
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
