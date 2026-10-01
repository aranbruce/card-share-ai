import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSupabaseServerAuth, forwardedClientIp } from "./auth-server"

const createServerClient = vi.fn()
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}))

const cookies = { getAll: () => [], setAll: () => {} }

describe("forwardedClientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
    })
    expect(forwardedClientIp(headers)).toBe("203.0.113.7")
  })

  it("is null without the header", () => {
    expect(forwardedClientIp(new Headers())).toBeNull()
  })
})

describe("createSupabaseServerAuth", () => {
  const auth = { getUser: vi.fn() }

  beforeEach(() => {
    createServerClient.mockReset().mockReturnValue({ auth, from: vi.fn() })
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ref.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the secret key and forwards the visitor IP", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test")
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })

    const result = createSupabaseServerAuth(headers, cookies)

    expect(result).toBe(auth)
    expect(createServerClient).toHaveBeenCalledWith(
      "https://ref.supabase.co",
      "sb_secret_test",
      {
        cookies,
        global: { headers: { "sb-forwarded-for": "203.0.113.7" } },
      },
    )
  })

  it("falls back to the anon key without forwarding when no secret key is set", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "")
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7" })

    createSupabaseServerAuth(headers, cookies)

    expect(createServerClient).toHaveBeenCalledWith(
      "https://ref.supabase.co",
      "anon-key",
      { cookies },
    )
  })

  it("sends no forwarding header when the request has no IP", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test")

    createSupabaseServerAuth(new Headers(), cookies)

    expect(createServerClient).toHaveBeenCalledWith(
      "https://ref.supabase.co",
      "sb_secret_test",
      { cookies },
    )
  })
})
