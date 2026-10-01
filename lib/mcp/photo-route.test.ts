import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { OPTIONS, POST } from "@/app/api/mcp/photo/route"
import { createPhotoToken } from "@/lib/mcp/photo-token"

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/mcp/photo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  )
}

describe("POST /api/mcp/photo", () => {
  beforeEach(() => {
    process.env.MCP_PHOTO_TOKEN_SECRET = "test-secret"
  })
  afterEach(() => {
    delete process.env.MCP_PHOTO_TOKEN_SECRET
  })

  it("lets the sandboxed view call it cross-origin", () => {
    const res = OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get("access-control-allow-origin")).toBe("*")
  })

  it("rejects a missing or forged token", async () => {
    const res = await post({
      token: "forged.token",
      photo: "data:image/png;base64,AA",
    })
    expect(res.status).toBe(401)
    expect(res.headers.get("access-control-allow-origin")).toBe("*")
  })

  it("rejects something that isn't an image", async () => {
    const token = createPhotoToken({
      purpose: "card-photo",
      userId: "user-1",
      cardId: "card-1",
    })
    const res = await post({ token, photo: "data:text/plain;base64,aGk=" })
    expect(res.status).toBe(400)
  })
})
