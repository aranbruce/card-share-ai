import {
  MCP_METADATA_CORS_HEADERS,
  protectedResourceMetadataResponse,
} from "@/lib/mcp/metadata"

export function GET(req: Request) {
  return protectedResourceMetadataResponse(req)
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: MCP_METADATA_CORS_HEADERS })
}
