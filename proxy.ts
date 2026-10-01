import { type NextRequest, NextResponse } from "next/server"
import { tryPostHogProxy } from "@/lib/posthog-proxy"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  const posthogResponse = tryPostHogProxy(request)
  if (posthogResponse) {
    return posthogResponse
  }

  // PKCE recovery links often land here as /reset-password?code=…
  // The code must be exchanged on /recovery-callback or there is no session for updateUser.
  const url = request.nextUrl
  if (url.pathname === "/reset-password") {
    const code = url.searchParams.get("code")
    if (code) {
      const redirect = new URL("/recovery-callback", request.url)
      redirect.searchParams.set("code", code)
      return NextResponse.redirect(redirect)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - mcp, .well-known (MCP endpoint and OAuth metadata use bearer tokens, not cookies)
     */
    "/((?!_next/static|_next/image|favicon.ico|mcp(?:/|$)|\\.well-known/).*)",
  ],
}
