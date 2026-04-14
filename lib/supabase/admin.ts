import { createClient } from "@supabase/supabase-js"

/** Service-role client for trusted server routes (e.g. Storage uploads). */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Same as `createServiceRoleClient` but throws when env vars are missing. */
export function requireServiceRoleClient() {
  const client = createServiceRoleClient()
  if (!client) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be configured for this route",
    )
  }
  return client
}
