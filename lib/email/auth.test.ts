import { describe, expect, it, vi, afterEach } from "vitest"

import {
  buildSupabaseAuthLink,
  buildTokenHashAuthLink,
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

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("buildSupabaseAuthLink", () => {
  it("builds a Supabase verify URL with encoded params", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/")

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
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")

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

describe("buildTokenHashAuthLink", () => {
  const confirm = { path: "/callback", type: "email" } as const

  it("links to the callback route with a token_hash instead of the Supabase verify URL", () => {
    const link = new URL(
      buildTokenHashAuthLink(
        { ...baseEmailData, email_action_type: "signup" },
        confirm,
      ),
    )

    expect(link.origin + link.pathname).toBe("https://app.example.com/callback")
    expect(link.searchParams.get("token_hash")).toBe("hash")
    expect(link.searchParams.get("type")).toBe("email")
    expect(link.searchParams.has("next")).toBe(false)
  })

  it("keeps the next param from redirect_to", () => {
    const link = new URL(
      buildTokenHashAuthLink(
        {
          ...baseEmailData,
          email_action_type: "signup",
          redirect_to:
            "https://app.example.com/callback?next=%2Fcreate%3Faction%3Dsave",
        },
        confirm,
      ),
    )

    expect(link.searchParams.get("next")).toBe("/create?action=save")
  })

  it("links recovery emails to /recovery-callback", () => {
    const link = new URL(
      buildTokenHashAuthLink(
        {
          ...baseEmailData,
          email_action_type: "recovery",
          redirect_to: "https://app.example.com/recovery-callback",
        },
        { path: "/recovery-callback", type: "recovery" },
      ),
    )

    expect(link.origin + link.pathname).toBe(
      "https://app.example.com/recovery-callback",
    )
    expect(link.searchParams.get("type")).toBe("recovery")
  })

  it("falls back to site_url's callback when redirect_to is elsewhere or empty", () => {
    const elsewhere = new URL(
      buildTokenHashAuthLink(
        {
          ...baseEmailData,
          email_action_type: "signup",
          redirect_to: "https://app.example.com/?next=/evil",
        },
        confirm,
      ),
    )
    expect(elsewhere.pathname).toBe("/callback")
    expect(elsewhere.searchParams.has("next")).toBe(false)

    const empty = new URL(
      buildTokenHashAuthLink(
        { ...baseEmailData, email_action_type: "signup", redirect_to: "" },
        confirm,
      ),
    )
    expect(empty.origin + empty.pathname).toBe(
      "https://app.example.com/callback",
    )
  })

  it.each(["app.example.com", "localhost:3000", "cardshare.ai:443"])(
    "falls back to the Supabase verify link when site_url is %s",
    (siteUrl) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")

      const link = new URL(
        buildTokenHashAuthLink(
          {
            ...baseEmailData,
            email_action_type: "signup",
            redirect_to: "",
            site_url: siteUrl,
          },
          confirm,
        ),
      )

      expect(link.origin + link.pathname).toBe(
        "https://project.supabase.co/auth/v1/verify",
      )
    },
  )
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
      "Your CardShare.ai password was changed",
    )
  })

  it("maps secure email-change hashes per Supabase hook docs", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")

    const deliveries = resolveAuthEmailDeliveries(
      { email: "current@example.com", new_email: "new@example.com" },
      {
        ...baseEmailData,
        email_action_type: "email_change",
        token_hash: "new-address-hash",
        token_hash_new: "current-address-hash",
      },
    )

    expect(deliveries).toHaveLength(2)
    expect(deliveries?.[0]?.to).toBe("current@example.com")
    expect(deliveries?.[1]?.to).toBe("new@example.com")

    const currentLink = new URL(
      deliveries![0]!.content.text.match(/https?:\/\/\S+/)![0],
    )
    const newLink = new URL(
      deliveries![1]!.content.text.match(/https?:\/\/\S+/)![0],
    )

    expect(currentLink.searchParams.get("token")).toBe("current-address-hash")
    expect(newLink.searchParams.get("token")).toBe("new-address-hash")
    expect(currentLink.searchParams.get("type")).toBe("email_change")
    expect(newLink.searchParams.get("type")).toBe("email_change")
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
        subject: "Your CardShare.ai password was changed",
      }),
    )
  })

  it("sends verification email for signup", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
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
        subject: "Verify your CardShare.ai email",
        text: expect.stringContaining(
          "https://app.example.com/callback?token_hash=hash&type=email",
        ),
      }),
    )
  })

  it("sends reset email for recovery", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
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
        subject: "Reset your CardShare.ai password",
        text: expect.stringContaining(
          "https://app.example.com/recovery-callback?token_hash=hash&type=recovery",
        ),
      }),
    )
  })
})
