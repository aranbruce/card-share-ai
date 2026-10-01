import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const verifyOtp = vi.fn()
const exchangeCodeForSession = vi.fn()

vi.mock("@/lib/supabase/route-handler", () => ({
  createSupabaseRouteHandlerClient: () => ({
    auth: { verifyOtp, exchangeCodeForSession },
  }),
}))

import { completeAuthCallback, formParams } from "./complete-auth-callback"

type Options = Parameters<typeof completeAuthCallback>[2]

function run(
  query: string,
  options: Options = { successPath: "/dashboard", otpType: "email" },
) {
  const request = new NextRequest(`https://app.example.com/callback?${query}`)
  return completeAuthCallback(
    request,
    new URL(request.url).searchParams,
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
    // 303 so a POST from /confirm is followed by a GET.
    expect(response.status).toBe(303)
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
    verifyOtp.mockResolvedValue({
      error: { code: "unexpected_failure", message: "Something broke" },
    })

    const response = await run("token_hash=abc&type=email")

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=Something%20broke",
    )
  })

  it.each([
    ["email", "already confirmed your email, sign in below"],
    ["recovery", "Use Forgot password to request a new one"],
  ] as const)(
    "explains expired or used %s links",
    async (otpType, expected) => {
      verifyOtp.mockResolvedValue({
        error: { code: "otp_expired", message: "Email link is invalid" },
      })

      const response = await run(`token_hash=abc&type=${otpType}`, {
        successPath: "/next",
        otpType,
      })

      const location = new URL(response.headers.get("location") ?? "")
      expect(location.pathname).toBe("/login")
      expect(location.searchParams.get("error")).toContain(expected)
    },
  )

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

describe("formParams", () => {
  it("reads string fields from a form POST", async () => {
    const body = new URLSearchParams({
      token_hash: "abc",
      type: "email",
      next: "/create?action=save",
    })
    const request = new NextRequest("https://app.example.com/callback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    })

    const params = await formParams(request)

    expect(params.get("token_hash")).toBe("abc")
    expect(params.get("type")).toBe("email")
    expect(params.get("next")).toBe("/create?action=save")
  })
})
