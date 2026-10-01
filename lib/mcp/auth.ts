import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { AuthInfo } from "@modelcontextprotocol/server"

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured",
    )
  }
  return { url, anonKey }
}

/** Supabase Auth's issuer, which doubles as the MCP server's OAuth 2.1 authorization server. */
export function supabaseAuthIssuer(): string {
  return `${supabaseEnv().url.replace(/\/+$/, "")}/auth/v1`
}

/**
 * Supabase client that acts as the signed-in user, so Row Level Security
 * applies exactly as it does in the web app.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = supabaseEnv()
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** The Supabase user an MCP request is acting for, set by `verifyMcpAccessToken`. */
export function mcpUserId(authInfo: AuthInfo | undefined): string | null {
  const userId = authInfo?.extra?.userId
  return typeof userId === "string" && userId ? userId : null
}

/** The token's alg and kid only, for logs; never log the token itself. */
function tokenHeaderSummary(token: string): string {
  try {
    const header = JSON.parse(
      Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8"),
    ) as { alg?: unknown; kid?: unknown }
    return `alg=${String(header.alg)} kid=${header.kid ? "set" : "missing"}`
  } catch {
    return "not a JWT"
  }
}

/**
 * Checks an OAuth access token issued by Supabase Auth's OAuth 2.1 server
 * (or a regular Supabase session token) and returns who it belongs to.
 */
export async function verifyMcpAccessToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined

  const { url, anonKey } = supabaseEnv()
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.getClaims(bearerToken)
  if (error || !data) {
    console.warn("[mcp/auth] token rejected:", error?.message ?? "no claims", {
      header: tokenHeaderSummary(bearerToken),
    })
    return undefined
  }

  const claims = data.claims
  if (!claims.sub || claims.is_anonymous) {
    console.warn("[mcp/auth] token rejected: no user or anonymous user")
    return undefined
  }

  const clientId =
    typeof claims.client_id === "string" ? claims.client_id : "cardshare-web"
  const scope = typeof claims.scope === "string" ? claims.scope : ""

  return {
    token: bearerToken,
    clientId,
    scopes: scope.split(" ").filter(Boolean),
    expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    extra: { userId: claims.sub },
  }
}
