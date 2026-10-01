import type { AuthError, EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler"

const EXPIRED_LINK_MESSAGES: Partial<Record<EmailOtpType, string>> = {
  email:
    "This confirmation link has expired or was already used. If you've already confirmed your email, sign in below.",
  recovery:
    "This reset link has expired or was already used. Use Forgot password to request a new one.",
}

// 303 so a POST from the /confirm page is followed by a GET.
function redirectTo(path: string, origin: string) {
  return NextResponse.redirect(new URL(path, origin), 303)
}

function loginErrorRedirect(message: string, origin: string) {
  return redirectTo(`/login?error=${encodeURIComponent(message)}`, origin)
}

function authErrorMessage(error: AuthError, otpType: EmailOtpType) {
  return (
    (error.code === "otp_expired" && EXPIRED_LINK_MESSAGES[otpType]) ||
    error.message
  )
}

/** Reads string fields from a form POST (e.g. the /confirm page) as params. */
export async function formParams(request: NextRequest) {
  const params = new URLSearchParams()
  for (const [key, value] of await request.formData()) {
    if (typeof value === "string") params.set(key, value)
  }
  return params
}

/**
 * Finishes an auth redirect in a Route Handler and redirects to `successPath`
 * with the session cookies set on that response.
 *
 * Email links built by our Send Email hook open the /confirm page, which POSTs
 * `token_hash` + `type` here only when the user clicks, so link scanners can't
 * use up the token. These are verified with verifyOtp and work in any browser.
 * OAuth (and older email links) GET here with a PKCE `code`, which needs the
 * verifier cookie from the starting browser.
 */
export async function completeAuthCallback(
  request: NextRequest,
  params: URLSearchParams,
  { successPath, otpType }: { successPath: string; otpType: EmailOtpType },
): Promise<NextResponse> {
  const { origin } = new URL(request.url)

  const errorParam = params.get("error")
  if (errorParam) {
    return loginErrorRedirect(
      params.get("error_description") ?? errorParam,
      origin,
    )
  }

  // Only accept the OTP type this route is for, so e.g. /callback can't redeem
  // a recovery token.
  const tokenHash =
    params.get("type") === otpType ? params.get("token_hash") : null
  const code = params.get("code")

  const response = redirectTo(successPath, origin)
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
    ? loginErrorRedirect(authErrorMessage(result.error, otpType), origin)
    : response
}
