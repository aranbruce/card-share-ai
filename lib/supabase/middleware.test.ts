import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}))

const { updateSession } = await import("./middleware")

function request(path: string) {
  return new NextRequest(new URL(path, "https://www.cardshare.ai"))
}

describe("updateSession", () => {
  beforeEach(() => {
    getUser.mockReset()
  })

  it("sends signed-in visitors from the homepage to the dashboard", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })

    const res = await updateSession(request("/"))

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(
      "https://www.cardshare.ai/dashboard",
    )
  })

  it("lets signed-out visitors see the homepage", async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const res = await updateSession(request("/"))

    expect(res.headers.get("location")).toBeNull()
  })

  it("leaves other marketing pages alone when signed in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })

    const res = await updateSession(request("/browse/birthday"))

    expect(res.headers.get("location")).toBeNull()
  })
})
