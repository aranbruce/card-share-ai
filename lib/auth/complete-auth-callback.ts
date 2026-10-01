import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler"

function loginErrorRedirect(message: string, origin: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, origin),
  )
}

/**
 * Finishes an auth redirect in a Route Handler and redirects to `successPath`
 * with the session cookies set on that response.
 *
 * Email links built by our Send Email hook carry `token_hash` + `type`, verified
 * with verifyOtp so they work in any browser. OAuth (and older email links)
 * carry a PKCE `code`, which needs the verifier cookie from the starting browser.
 */
export async function completeAuthCallback(
  request: NextRequest,
  { successPath, otpType }: { successPath: string; otpType: EmailOtpType },
): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)

  const errorParam = searchParams.get("error")
  if (errorParam) {
    return loginErrorRedirect(
      searchParams.get("error_description") ?? errorParam,
      origin,
    )
  }

  // Only accept the OTP type this route is for, so e.g. /callback can't redeem
  // a recovery token.
  const tokenHash =
    searchParams.get("type") === otpType ? searchParams.get("token_hash") : null
  const code = searchParams.get("code")

  const response = NextResponse.redirect(new URL(successPath, origin))
  const supabase = createSupabaseRouteHandlerClient(request, response)

  let result
  if (tokenHash) {
    result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    })
  } else if (code) {
    result = await supabase.auth.exchangeCodeForSession(code)
  } else {
    return loginErrorRedirect("auth_callback_failed", origin)
  }

  return result.error
    ? loginErrorRedirect(result.error.message, origin)
    : response
}
