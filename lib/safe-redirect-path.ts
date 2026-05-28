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
  return redirect
}
