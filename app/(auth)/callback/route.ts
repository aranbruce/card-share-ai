import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler"
import { resolveSafePostAuthRedirectPath } from "@/lib/safe-redirect-path"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function resolveSafeNextPath(
  nextParam: string | null,
  type: string | null,
): string {
  const fallback = type === "recovery" ? "/reset-password" : "/dashboard"
  return resolveSafePostAuthRedirectPath(nextParam, fallback)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const type = requestUrl.searchParams.get("type")
  const nextParam = requestUrl.searchParams.get("next")
  const next = resolveSafeNextPath(nextParam, type)

  const errorParam = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription ?? errorParam)}`,
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
        `/login?error=${encodeURIComponent(error.message)}`,
        requestUrl.origin,
      ),
    )
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", requestUrl.origin),
  )
}
