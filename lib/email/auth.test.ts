import { describe, expect, it, vi, afterEach } from "vitest"

import {
  buildSupabaseAuthLink,
  isHandledAuthEmailType,
  sendAuthEmail,
} from "./auth"

vi.mock("@/lib/email/resend", () => ({
  sendEmailViaResend: vi.fn(),
}))

import { sendEmailViaResend } from "@/lib/email/resend"

const mockSend = vi.mocked(sendEmailViaResend)

describe("buildSupabaseAuthLink", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    }
  })

  it("builds a Supabase verify URL with encoded params", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co/"

    const link = buildSupabaseAuthLink({
      token: "123456",
      token_hash: "abc123hash",
      redirect_to: "https://app.example.com/callback",
      email_action_type: "signup",
      site_url: "https://app.example.com",
      token_new: "",
      token_hash_new: "",
    })

    const parsed = new URL(link)
    expect(parsed.origin + parsed.pathname).toBe(
      "https://project.supabase.co/auth/v1/verify",
    )
    expect(parsed.searchParams.get("token")).toBe("abc123hash")
    expect(parsed.searchParams.get("type")).toBe("signup")
    expect(parsed.searchParams.get("redirect_to")).toBe(
      "https://app.example.com/callback",
    )
  })
})

describe("isHandledAuthEmailType", () => {
  it("handles signup and recovery only", () => {
    expect(isHandledAuthEmailType("signup")).toBe(true)
    expect(isHandledAuthEmailType("recovery")).toBe(true)
    expect(isHandledAuthEmailType("magiclink")).toBe(false)
    expect(isHandledAuthEmailType("password_changed_notification")).toBe(false)
  })
})

describe("sendAuthEmail", () => {
  afterEach(() => {
    mockSend.mockReset()
  })

  it("skips unsupported notification types", async () => {
    const result = await sendAuthEmail({
      user: { email: "user@example.com" },
      emailData: {
        token: "123456",
        token_hash: "hash",
        redirect_to: "https://app.example.com/callback",
        email_action_type: "password_changed_notification",
        site_url: "https://app.example.com",
        token_new: "",
        token_hash_new: "",
      },
    })

    expect(result).toEqual({ ok: true, skipped: true })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("sends verification email for signup", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
    mockSend.mockResolvedValue({ ok: true, id: "email-id" })

    await sendAuthEmail({
      user: { email: "user@example.com" },
      emailData: {
        token: "123456",
        token_hash: "hash",
        redirect_to: "https://app.example.com/callback",
        email_action_type: "signup",
        site_url: "https://app.example.com",
        token_new: "",
        token_hash_new: "",
      },
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Verify your CardShareAI email",
        text: expect.stringContaining("Verify email"),
      }),
    )
  })

  it("sends reset email for recovery", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
    mockSend.mockResolvedValue({ ok: true, id: "email-id" })

    await sendAuthEmail({
      user: { email: "user@example.com" },
      emailData: {
        token: "123456",
        token_hash: "hash",
        redirect_to: "https://app.example.com/recovery-callback",
        email_action_type: "recovery",
        site_url: "https://app.example.com",
        token_new: "",
        token_hash_new: "",
      },
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Reset your CardShareAI password",
        text: expect.stringContaining("Reset password"),
      }),
    )
  })
})
