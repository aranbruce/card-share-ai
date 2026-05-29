import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import {
  getStandardWebhookHeaders,
  normalizeSendEmailHookSecret,
} from "./send-email-hook"

describe("normalizeSendEmailHookSecret", () => {
  it("strips the Supabase v1,whsec_ prefix", () => {
    expect(normalizeSendEmailHookSecret("v1,whsec_abc123")).toBe("abc123")
  })

  it("leaves an already-normalized secret unchanged", () => {
    expect(normalizeSendEmailHookSecret("abc123")).toBe("abc123")
  })
})

describe("getStandardWebhookHeaders", () => {
  it("collects standard webhook headers from the request", () => {
    const request = new NextRequest("http://localhost/api/auth/send-email", {
      headers: {
        "webhook-id": "msg_123",
        "webhook-timestamp": "1710000000",
        "webhook-signature": "v1,signature",
        "content-type": "application/json",
      },
    })

    expect(getStandardWebhookHeaders(request)).toEqual({
      "webhook-id": "msg_123",
      "webhook-timestamp": "1710000000",
      "webhook-signature": "v1,signature",
    })
  })
})
