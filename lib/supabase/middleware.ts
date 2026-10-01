import { type NextRequest, NextResponse } from "next/server"
import { buildLoginRedirectUrl } from "@/lib/safe-redirect-path"
import { createSupabaseServerAuth } from "@/lib/supabase/auth-server"

function applySessionArtifacts(
  from: NextResponse,
  to: NextResponse,
  authHeaders: Record<string, string>,
) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
  Object.entries(authHeaders).forEach(([key, value]) => {
    to.headers.set(key, value)
  })
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const pathnameWithSearch = pathname + request.nextUrl.search
  const requestHeaders = new Headers(request.headers)
  if (pathname.startsWith("/dashboard")) {
    requestHeaders.set("x-pathname", pathnameWithSearch)
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  // Headers from @supabase/ssr setAll (Cache-Control / Expires / Pragma) must also
  // land on redirect responses that carry refreshed auth cookies.
  let authResponseHeaders: Record<string, string> = {}

  // Auth only: refreshing here counts against Supabase's per-IP limits.
  const auth = createSupabaseServerAuth(request.headers, {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value)
      })
      // Next writes refreshed cookies onto request.headers, not the
      // requestHeaders copy taken at the start of updateSession.
      requestHeaders.set("cookie", request.headers.get("cookie") ?? "")
      // Rebuild so refreshed request cookies reach the page for this request,
      // while keeping x-pathname on the forwarded headers.
      supabaseResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      cookiesToSet.forEach(({ name, value, options }) => {
        supabaseResponse.cookies.set(name, value, options)
      })
      authResponseHeaders = headers
      Object.entries(headers).forEach(([key, value]) => {
        supabaseResponse.headers.set(key, value)
      })
    },
  })

  const {
    data: { user },
  } = await auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectResponse = NextResponse.redirect(
      new URL(buildLoginRedirectUrl(pathnameWithSearch), request.url),
    )
    applySessionArtifacts(
      supabaseResponse,
      redirectResponse,
      authResponseHeaders,
    )
    return redirectResponse
  }

  // Signed-in visitors skip the marketing homepage. Redirecting here (not in the page)
  // lets the homepage be prerendered and served from the CDN.
  if (user && pathname === "/") {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url),
    )
    applySessionArtifacts(
      supabaseResponse,
      redirectResponse,
      authResponseHeaders,
    )
    return redirectResponse
  }

  return supabaseResponse
}
