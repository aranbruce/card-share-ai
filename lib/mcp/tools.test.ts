import { describe, expect, it } from "vitest"
import { createMcpHandler } from "mcp-handler"
import { registerCardTools } from "@/lib/mcp/tools"

async function rpc(method: string, params: Record<string, unknown> = {}) {
  const handler = createMcpHandler(registerCardTools)
  const res = await handler(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
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
      "get_card",
      "list_cards",
      "update_card",
    ])
    for (const tool of tools) {
      expect(tool.annotations.title).toBeTruthy()
      expect(typeof tool.annotations.readOnlyHint).toBe("boolean")
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
})
