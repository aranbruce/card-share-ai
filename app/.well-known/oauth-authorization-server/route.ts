import { supabaseAuthIssuer } from "@/lib/mcp/auth"
import { MCP_METADATA_CORS_HEADERS } from "@/lib/mcp/metadata"

/**
 * Mirrors Supabase Auth's RFC 8414 metadata on this origin, for MCP clients
 * that look for the authorization server next to the resource instead of
 * following the protected resource metadata.
 */
export async function GET() {
  const issuer = new URL(supabaseAuthIssuer())
  const res = await fetch(
    `${issuer.origin}/.well-known/oauth-authorization-server${issuer.pathname}`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) {
    return Response.json(
      { error: "authorization_server_unavailable" },
      { status: 502, headers: MCP_METADATA_CORS_HEADERS },
    )
  }
  return Response.json(await res.json(), {
    headers: { ...MCP_METADATA_CORS_HEADERS, "Cache-Control": "max-age=3600" },
  })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: MCP_METADATA_CORS_HEADERS })
}
