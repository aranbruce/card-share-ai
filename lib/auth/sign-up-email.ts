import { z } from "zod"
import { hasPendingCard } from "@/lib/pending-card-storage"

/** Supabase allows one confirmation email per address about every 60 seconds. */
export const RESEND_COOLDOWN_SECONDS = 60

const KEY = "signUpEmail"

const sentSignUpEmailSchema = z.object({
  email: z.string(),
  sentAt: z.number(),
})

export type SentSignUpEmail = z.infer<typeof sentSignUpEmailSchema>

/**
 * Where the confirmation link returns to. When a guest draft is stored, land on
 * /create so it persists the pending card from localStorage.
 */
export function buildSignUpEmailRedirectTo(origin: string): string {
  const redirectTo = new URL("/callback", origin)
  if (hasPendingCard()) {
    redirectTo.searchParams.set("next", "/create?action=save")
  }
  return redirectTo.toString()
}

// sessionStorage doesn't fire "storage" events in the tab that wrote it, so
// writes notify same-tab subscribers directly.
const listeners = new Set<() => void>()

/** For useSyncExternalStore: notified when rememberSignUpEmail writes. */
export function subscribeSignUpEmail(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Remembers the address a confirmation email was sent to, for the resend
 * button on /sign-up-success. Kept in sessionStorage (not the URL) so the
 * address stays out of browser history and logs.
 */
export function rememberSignUpEmail(email: string, sentAt = Date.now()): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ email, sentAt }))
  } catch {
    // Storage blocked — the success page falls back to "sign up again".
    return
  }
  listeners.forEach((listener) => listener())
}

/** Raw stored value; a string so it can be a stable useSyncExternalStore snapshot. */
export function readSignUpEmailRaw(): string | null {
  if (typeof window === "undefined") return null
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function parseSignUpEmail(raw: string | null): SentSignUpEmail | null {
  if (!raw) return null
  try {
    return sentSignUpEmailSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function secondsUntilResend(sentAt: number, now: number): number {
  const elapsed = Math.floor((now - sentAt) / 1000)
  return Math.min(
    RESEND_COOLDOWN_SECONDS,
    Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed),
  )
}
