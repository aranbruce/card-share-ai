import { afterEach, describe, expect, it } from "vitest"
import { GET } from "@/app/.well-known/openai-apps-challenge/route"

describe("GET /.well-known/openai-apps-challenge", () => {
  afterEach(() => {
    delete process.env.OPENAI_APPS_CHALLENGE_TOKEN
  })

  it("serves the token as plain text", async () => {
    process.env.OPENAI_APPS_CHALLENGE_TOKEN = "abc123\n"
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/)
    expect(await res.text()).toBe("abc123")
  })

  it("is not found until a token is configured", () => {
    expect(GET().status).toBe(404)
  })
})
