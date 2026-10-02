import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { verifyPhotoToken } from "@/lib/mcp/photo-token"
import { PHOTO_UPLOAD_META_KEY, registerCardTools } from "@/lib/mcp/tools"

async function rpc(
  method: string,
  params: Record<string, unknown> = {},
  { signedInAs }: { signedInAs?: string } = {},
) {
  const mcp = createMcpHandler(registerCardTools)
  // Stands in for Supabase token checks: any bearer token is this user
  const handler = signedInAs
    ? withMcpAuth(mcp, (_req, token) =>
        token
          ? {
              token,
              clientId: "test",
              scopes: [],
              extra: { userId: signedInAs },
            }
          : undefined,
      )
    : mcp
  const res = await handler(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        ...(signedInAs ? { authorization: "Bearer test-token" } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  )
  const body = await res.text()
  // Streamable HTTP may answer as SSE; take the JSON from the data line
  const json = body.trim().startsWith("{")
    ? body
    : (body.split("\n").find((l) => l.startsWith("data:")) ?? "").slice(5)
  return JSON.parse(json)
}

describe("MCP card tools", () => {
  it("lists the tools with annotations for the directories", async () => {
    const { result } = await rpc("tools/list")
    const tools = result.tools as {
      name: string
      annotations: Record<string, unknown>
      inputSchema: { properties: Record<string, unknown> }
    }[]
    expect(tools.map((t) => t.name).sort()).toEqual([
      "create_card",
      "create_card_from_photo",
      "get_card",
      "list_cards",
      "update_card",
    ])
    for (const tool of tools) {
      expect(tool.annotations.title).toBeTruthy()
      // ChatGPT asks for all three hints as explicit booleans on every tool
      for (const hint of ["readOnlyHint", "destructiveHint", "openWorldHint"]) {
        expect(typeof tool.annotations[hint], `${tool.name}.${hint}`).toBe(
          "boolean",
        )
      }
    }
    const create = tools.find((t) => t.name === "create_card")!
    expect(create.annotations.destructiveHint).toBe(false)
    const update = tools.find((t) => t.name === "update_card")!
    expect(update.annotations.destructiveHint).toBe(true)
    expect(Object.keys(update.inputSchema.properties)).toEqual(
      expect.arrayContaining(["headline", "myMessage"]),
    )
    expect(Object.keys(create.inputSchema.properties)).toContain("tone")
  })

  it("keeps tool descriptions to what each tool does", async () => {
    // Directory policy: no instructions about other tools in descriptions.
    // Usage guidance lives in the server instructions instead.
    const { result } = await rpc("tools/list")
    const names: string[] = result.tools.map((t: { name: string }) => t.name)
    for (const tool of result.tools) {
      const text = JSON.stringify({
        description: tool.description,
        inputSchema: tool.inputSchema,
      })
      for (const other of names.filter((n) => n !== tool.name)) {
        expect(text, `${tool.name} mentions ${other}`).not.toContain(other)
      }
    }
  })

  it("links every tool to the card view", async () => {
    const { result } = await rpc("tools/list")
    for (const tool of result.tools) {
      expect(tool._meta.ui.resourceUri).toBe("ui://cardshare/cards.html")
    }
  })

  it("serves the card view as an MCP Apps resource", async () => {
    const { result } = await rpc("resources/read", {
      uri: "ui://cardshare/cards.html",
    })
    const [content] = result.contents
    expect(content.mimeType).toBe("text/html;profile=mcp-app")
    expect(content.text).toContain('<div id="root"></div>')
    expect(content._meta.ui.csp.resourceDomains).toHaveLength(1)
  })

  it("refuses tool calls without a signed-in user", async () => {
    const { result } = await rpc("tools/call", {
      name: "list_cards",
      arguments: {},
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/not signed in/)
  })

  describe("create_card_from_photo", () => {
    beforeEach(() => {
      process.env.MCP_PHOTO_TOKEN_SECRET = "test-secret"
      process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co"
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon"
    })
    afterEach(() => {
      delete process.env.MCP_PHOTO_TOKEN_SECRET
    })

    const args = {
      recipientName: "Sarah",
      senderName: "The team",
      cardType: "birthday",
      tone: "Hype",
      context: "loves climbing",
    }

    it("shows the picker and gives only the view an upload token", async () => {
      const { result } = await rpc(
        "tools/call",
        { name: "create_card_from_photo", arguments: args },
        { signedInAs: "user-1" },
      )
      expect(result.isError).toBeFalsy()
      expect(result.structuredContent).toEqual({
        pendingPhoto: { recipientName: "Sarah" },
      })

      const upload = result._meta[PHOTO_UPLOAD_META_KEY]
      expect(upload.url).toMatch(/\/api\/mcp\/photo$/)
      expect(verifyPhotoToken(upload.token)).toEqual({
        purpose: "new-card-photo",
        userId: "user-1",
        nonce: expect.stringMatching(/^[0-9a-f-]{36}$/),
        card: args,
      })
      // The model never sees the token
      expect(JSON.stringify(result.content)).not.toContain(upload.token)
    })

    it("says photos are unavailable without a token secret", async () => {
      delete process.env.MCP_PHOTO_TOKEN_SECRET
      const { result } = await rpc(
        "tools/call",
        { name: "create_card_from_photo", arguments: args },
        { signedInAs: "user-1" },
      )
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toMatch(/without a photo/)
    })
  })
})
