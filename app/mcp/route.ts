import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { verifyMcpAccessToken } from "@/lib/mcp/auth"
import { MCP_PROTECTED_RESOURCE_METADATA_PATH } from "@/lib/mcp/metadata"
import { MCP_SERVER_INSTRUCTIONS } from "@/lib/mcp/instructions"
import { registerCardTools } from "@/lib/mcp/tools"

// create_card waits on headline and cover art generation
export const maxDuration = 120

const handler = createMcpHandler(registerCardTools, {
  serverInfo: { name: "cardshare-ai", version: "1.0.0" },
  instructions: MCP_SERVER_INSTRUCTIONS,
})

const authHandler = withMcpAuth(handler, verifyMcpAccessToken, {
  required: true,
  resourceMetadataPath: MCP_PROTECTED_RESOURCE_METADATA_PATH,
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
