import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { buildLoginRedirectUrl } from "@/lib/safe-redirect-path"

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const pathnameWithSearch = pathname + request.nextUrl.search
  const requestHeaders = new Headers(request.headers)
  if (pathname.startsWith("/dashboard")) {
    requestHeaders.set("x-pathname", pathnameWithSearch)
  }

  const supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectResponse = NextResponse.redirect(
      new URL(buildLoginRedirectUrl(pathnameWithSearch), request.url),
    )
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  // Signed-in visitors skip the marketing homepage. Redirecting here (not in the page)
  // lets the homepage be prerendered and served from the CDN.
  if (user && pathname === "/") {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url),
    )
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
