import { type CookieMethodsServer, createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

/** Auth API surface only: no `.from()`/storage, and no `admin`. */
export type SupabaseServerAuth = Omit<SupabaseClient["auth"], "admin">

/** The visitor's IP: the first `x-forwarded-for` hop (set by Vercel). */
export function forwardedClientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
}

/**
 * Supabase Auth client for server-side Auth API calls (session refresh,
 * getUser, verifyOtp, exchangeCodeForSession).
 *
 * Supabase rate-limits these per IP, and from the server every visitor shares
 * our IP. With `SUPABASE_SECRET_KEY` set, requests carry `sb-forwarded-for`
 * so limits apply per visitor instead (Supabase only honours the header for
 * secret keys, and only with "IP address forwarding" on under Auth → Rate
 * Limits). Without it, this falls back to the anon key and no header.
 *
 * The secret key bypasses RLS, so only the `auth` API is returned: never build
 * data queries on this client — use the anon-key clients in this folder.
 * Session cookies are keyed by the project URL, not the API key, so this reads
 * and writes the same cookies as the other clients.
 */
export function createSupabaseServerAuth(
  headers: Headers,
  cookies: CookieMethodsServer,
): SupabaseServerAuth {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const ip = secretKey ? forwardedClientIp(headers) : null

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies,
      ...(ip ? { global: { headers: { "sb-forwarded-for": ip } } } : null),
    },
  ).auth
}
