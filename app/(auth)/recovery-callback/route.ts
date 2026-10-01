import {
  completeAuthCallback,
  formParams,
} from "@/lib/auth/complete-auth-callback"
import type { NextRequest } from "next/server"

/**
 * Password resets finish here: the /confirm page posts a token_hash when the
 * user clicks, and older emails redirect with a PKCE code. The session must be
 * set on a Route Handler response so /reset-password can call updateUser.
 */
const options = { successPath: "/reset-password", otpType: "recovery" } as const

export async function GET(request: NextRequest) {
  return completeAuthCallback(
    request,
    new URL(request.url).searchParams,
    options,
  )
}

export async function POST(request: NextRequest) {
  return completeAuthCallback(request, await formParams(request), options)
}
