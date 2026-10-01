/**
 * Restricts post-auth redirects to same-origin paths so `redirect` query values
 * cannot be abused for open redirects (e.g. `https://evil.com`).
 * Mirrors the rules in `app/(auth)/callback/route.ts` (`resolveSafeNextPath`).
 */
export function resolveSafePostAuthRedirectPath(
  redirect: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (redirect == null || redirect === "") return fallback
  if (!redirect.startsWith("/")) return fallback
  if (redirect.startsWith("//")) return fallback
  // Browsers treat "\" like "/" in URLs, so "/\evil.com" is protocol-relative too.
  // Tabs and newlines are stripped by the URL parser, so "/\t/evil.com" is as well.
  if (/[\\\t\n\r]/.test(redirect)) return fallback
  return redirect
}

export function buildLoginRedirectUrl(
  requestedPath: string | null | undefined,
): string {
  const safePath = resolveSafePostAuthRedirectPath(requestedPath)
  return `/login?redirect=${encodeURIComponent(safePath)}`
}
