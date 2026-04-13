import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const nextParam = requestUrl.searchParams.get('next')
  const next =
    nextParam ?? (type === 'recovery' ? '/auth/reset-password' : '/dashboard')

  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(errorDescription ?? errorParam)}`,
        requestUrl.origin,
      ),
    )
  }

  if (code) {
    const redirectUrl = new URL(next, requestUrl.origin)
    const response = NextResponse.redirect(redirectUrl)
    const supabase = createSupabaseRouteHandlerClient(request, response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(error.message)}`,
        requestUrl.origin,
      ),
    )
  }

  return NextResponse.redirect(
    new URL('/auth/login?error=auth_callback_failed', requestUrl.origin),
  )
}
