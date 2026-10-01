import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const verifyOtp = vi.fn()
const exchangeCodeForSession = vi.fn()

vi.mock("@/lib/supabase/route-handler", () => ({
  createSupabaseRouteHandlerClient: () => ({
    auth: { verifyOtp, exchangeCodeForSession },
  }),
}))

import { completeAuthCallback } from "./complete-auth-callback"

type Options = Parameters<typeof completeAuthCallback>[1]

function run(
  query: string,
  options: Options = { successPath: "/dashboard", otpType: "email" },
) {
  return completeAuthCallback(
    new NextRequest(`https://app.example.com/callback?${query}`),
    options,
  )
}

describe("completeAuthCallback", () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ error: null })
    exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  })

  it("verifies a token_hash and redirects to the success path", async () => {
    const response = await run("token_hash=abc&type=email")

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/dashboard",
    )
  })

  it("exchanges a PKCE code when there is no token_hash", async () => {
    const response = await run("code=xyz")

    expect(exchangeCodeForSession).toHaveBeenCalledWith("xyz")
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/dashboard",
    )
  })

  it("ignores a token_hash whose type is not the route's OTP type", async () => {
    const response = await run("token_hash=abc&type=recovery")

    expect(verifyOtp).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=auth_callback_failed",
    )
  })

  it("redirects to login with the verification error", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired" } })

    const response = await run("token_hash=abc&type=email")

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=Token%20has%20expired",
    )
  })

  it("redirects to login with the provider error description", async () => {
    const response = await run("error=access_denied&error_description=Denied")

    expect(verifyOtp).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=Denied",
    )
  })

  it("verifies recovery tokens for the recovery route", async () => {
    const response = await run("token_hash=abc&type=recovery", {
      successPath: "/reset-password",
      otpType: "recovery",
    })

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "abc",
      type: "recovery",
    })
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/reset-password",
    )
  })
})
