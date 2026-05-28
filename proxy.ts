import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
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
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
