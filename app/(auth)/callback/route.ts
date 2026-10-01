import {
  completeAuthCallback,
  formParams,
} from "@/lib/auth/complete-auth-callback"
import { resolveSafePostAuthRedirectPath } from "@/lib/safe-redirect-path"
import type { NextRequest } from "next/server"

function resolveSafeNextPath(
  nextParam: string | null,
  type: string | null,
): string {
  const fallback = type === "recovery" ? "/reset-password" : "/dashboard"
  return resolveSafePostAuthRedirectPath(nextParam, fallback)
}

function complete(request: NextRequest, params: URLSearchParams) {
  const next = resolveSafeNextPath(params.get("next"), params.get("type"))
  return completeAuthCallback(request, params, {
    successPath: next,
    otpType: "email",
  })
}

/** OAuth and older email links redirect here with a PKCE code. */
export async function GET(request: NextRequest) {
  return complete(request, new URL(request.url).searchParams)
}

/** The /confirm page posts the email token_hash here when the user clicks. */
export async function POST(request: NextRequest) {
  return complete(request, await formParams(request))
}
