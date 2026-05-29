import { describe, expect, it, vi, afterEach } from "vitest"

import {
  buildSupabaseAuthLink,
  isHandledAuthEmailType,
  resolveAuthEmailDeliveries,
  sendAuthEmail,
} from "./auth"

vi.mock("@/lib/email/resend", () => ({
  sendEmailViaResend: vi.fn(),
}))

import { sendEmailViaResend } from "@/lib/email/resend"

const mockSend = vi.mocked(sendEmailViaResend)

const baseEmailData = {
  token: "123456",
  token_hash: "hash",
  redirect_to: "https://app.example.com/callback",
  site_url: "https://app.example.com",
  token_new: "",
  token_hash_new: "",
}

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
      ...baseEmailData,
      email_action_type: "signup",
    })

    const parsed = new URL(link)
    expect(parsed.origin + parsed.pathname).toBe(
      "https://project.supabase.co/auth/v1/verify",
    )
    expect(parsed.searchParams.get("token")).toBe("hash")
    expect(parsed.searchParams.get("type")).toBe("signup")
    expect(parsed.searchParams.get("redirect_to")).toBe(
      "https://app.example.com/callback",
    )
  })

  it("supports overriding the token hash for secure email change", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"

    const link = buildSupabaseAuthLink(
      {
        ...baseEmailData,
        email_action_type: "email_change",
        token_hash_new: "current-hash",
      },
      "current-hash",
    )

    expect(new URL(link).searchParams.get("token")).toBe("current-hash")
  })
})

describe("isHandledAuthEmailType", () => {
  it("handles all Supabase auth email action types used by the hook", () => {
    const handled = [
      "signup",
      "email",
      "recovery",
      "magiclink",
      "invite",
      "email_change",
      "reauthentication",
      "password_changed_notification",
      "email_changed_notification",
      "phone_changed_notification",
      "identity_linked_notification",
      "identity_unlinked_notification",
      "mfa_factor_enrolled_notification",
      "mfa_factor_unenrolled_notification",
    ]

    for (const type of handled) {
      expect(isHandledAuthEmailType(type)).toBe(true)
    }

    expect(isHandledAuthEmailType("unknown_type")).toBe(false)
  })
})

describe("resolveAuthEmailDeliveries", () => {
  it("sends password changed notifications without skipping", () => {
    const deliveries = resolveAuthEmailDeliveries(
      { email: "user@example.com" },
      {
        ...baseEmailData,
        email_action_type: "password_changed_notification",
      },
    )

    expect(deliveries).toHaveLength(1)
    expect(deliveries?.[0]?.to).toBe("user@example.com")
    expect(deliveries?.[0]?.content.subject).toBe(
      "Your CardShareAI password was changed",
    )
  })

  it("sends secure email change messages to current and new addresses", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"

    const deliveries = resolveAuthEmailDeliveries(
      { email: "current@example.com", new_email: "new@example.com" },
      {
        ...baseEmailData,
        email_action_type: "email_change",
        token_hash_new: "current-hash",
      },
    )

    expect(deliveries).toHaveLength(2)
    expect(deliveries?.[0]?.to).toBe("current@example.com")
    expect(deliveries?.[1]?.to).toBe("new@example.com")
  })
})

describe("sendAuthEmail", () => {
  afterEach(() => {
    mockSend.mockReset()
  })

  it("returns an error for unsupported auth email types", async () => {
    const result = await sendAuthEmail({
      user: { email: "user@example.com" },
      emailData: {
        ...baseEmailData,
        email_action_type: "unknown_type",
      },
    })

    expect(result).toEqual({
      ok: false,
      error: "Unsupported auth email type: unknown_type",
    })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("sends password changed notifications", async () => {
    mockSend.mockResolvedValue({ ok: true, id: "email-id" })

    const result = await sendAuthEmail({
      user: { email: "user@example.com" },
      emailData: {
        ...baseEmailData,
        email_action_type: "password_changed_notification",
      },
    })

    expect(result).toEqual({ ok: true, id: "email-id" })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Your CardShareAI password was changed",
      }),
    )
  })

  it("sends verification email for signup", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
    mockSend.mockResolvedValue({ ok: true, id: "email-id" })

    await sendAuthEmail({
      user: { email: "user@example.com" },
      emailData: {
        ...baseEmailData,
        email_action_type: "signup",
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
        ...baseEmailData,
        redirect_to: "https://app.example.com/recovery-callback",
        email_action_type: "recovery",
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
