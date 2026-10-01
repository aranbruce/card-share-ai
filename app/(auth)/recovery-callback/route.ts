import { completeAuthCallback } from "@/lib/auth/complete-auth-callback"
import type { NextRequest } from "next/server"

/**
 * Password-reset emails link here with a token_hash (or, for older emails, a
 * PKCE code via redirect_to). The session must be set on a Route Handler
 * response so /reset-password can call updateUser.
 */
export async function GET(request: NextRequest) {
  return completeAuthCallback(request, {
    successPath: "/reset-password",
    otpType: "recovery",
  })
}
