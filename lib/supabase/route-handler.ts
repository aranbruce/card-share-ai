import type { NextRequest } from "next/server"
import type { NextResponse } from "next/server"
import { createSupabaseServerAuth } from "@/lib/supabase/auth-server"

/**
 * Supabase Auth for Route Handlers where session cookies must be written to the
 * same NextResponse that is returned (e.g. after exchangeCodeForSession).
 * Using cookies() from next/headers here often does not attach Set-Cookie to the redirect.
 * Auth only (see createSupabaseServerAuth); it can't run data queries.
 */
export function createSupabaseRouteHandlerAuth(
  request: NextRequest,
  response: NextResponse,
) {
  return createSupabaseServerAuth(request.headers, {
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
  })
}
