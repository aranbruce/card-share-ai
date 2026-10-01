import { generateProtectedResourceMetadata, getPublicOrigin } from "mcp-handler"
import { supabaseAuthIssuer } from "@/lib/mcp/auth"

/** RFC 9728 path-suffixed metadata location for the `/mcp` resource. */
export const MCP_PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/mcp"

export const MCP_METADATA_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
}

/** Protected Resource Metadata pointing MCP clients at Supabase Auth's OAuth 2.1 server. */
export function protectedResourceMetadataResponse(req: Request): Response {
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [supabaseAuthIssuer()],
    resourceUrl: `${getPublicOrigin(req)}/mcp`,
    additionalMetadata: {
      resource_name: "CardShare.ai",
      resource_documentation: `${getPublicOrigin(req)}/llms.txt`,
    },
  })
  return Response.json(metadata, {
    headers: { ...MCP_METADATA_CORS_HEADERS, "Cache-Control": "max-age=3600" },
  })
}
