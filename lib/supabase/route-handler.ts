import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

/**
 * Supabase client for Route Handlers where session cookies must be written to the
 * same NextResponse that is returned (e.g. after exchangeCodeForSession).
 * Using cookies() from next/headers here often does not attach Set-Cookie to the redirect.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(headers ?? {}).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    },
  )
}
