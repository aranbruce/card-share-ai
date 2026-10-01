import { completeAuthCallback } from "@/lib/auth/complete-auth-callback"
import { resolveSafePostAuthRedirectPath } from "@/lib/safe-redirect-path"
import type { NextRequest } from "next/server"

function resolveSafeNextPath(
  nextParam: string | null,
  type: string | null,
): string {
  const fallback = type === "recovery" ? "/reset-password" : "/dashboard"
  return resolveSafePostAuthRedirectPath(nextParam, fallback)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const next = resolveSafeNextPath(
    searchParams.get("next"),
    searchParams.get("type"),
  )

  return completeAuthCallback(request, { successPath: next, otpType: "email" })
}
