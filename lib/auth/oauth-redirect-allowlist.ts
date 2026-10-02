/**
 * Where an OAuth app may send people after they approve it on our consent
 * page. Dynamic client registration lets anyone register an app with any
 * redirect, so the consent page refuses apps that would send the approved
 * sign-in anywhere other than the AI assistants we support.
 */
const ALLOWED_HTTPS_REDIRECTS: { origin: string; path: RegExp }[] = [
  // ChatGPT and Codex in the browser: callback-ID-specific and stable forms
  {
    origin: "https://chatgpt.com",
    path: /^\/connector\/oauth\/[A-Za-z0-9_-]+$/,
  },
  {
    origin: "https://chatgpt.com",
    path: /^\/connector_platform_oauth_redirect$/,
  },
  { origin: "https://claude.ai", path: /^\/api\/mcp\/auth_callback$/ },
]

/**
 * Native apps (e.g. Codex on the desktop) receive the sign-in on the user's
 * own machine, which nobody else can (RFC 8252 §7.3), so any loopback port
 * and path is fine.
 */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"])

export function isAllowedOAuthRedirect(redirectUri: string): boolean {
  let url: URL
  try {
    url = new URL(redirectUri)
  } catch {
    return false
  }
  if (url.username || url.password) return false

  if (url.protocol === "http:") return LOOPBACK_HOSTS.has(url.hostname)
  if (url.protocol !== "https:" || url.port) return false

  return ALLOWED_HTTPS_REDIRECTS.some(
    ({ origin, path }) => url.origin === origin && path.test(url.pathname),
  )
}
