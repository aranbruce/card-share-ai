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
    ])
    for (const tool of tools) {
      expect(tool.annotations.title).toBeTruthy()
      expect(typeof tool.annotations.readOnlyHint).toBe("boolean")
    }
    const create = tools.find((t) => t.name === "create_card")!
    expect(create.annotations.destructiveHint).toBe(false)
    expect(Object.keys(create.inputSchema.properties)).toContain("tone")
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
