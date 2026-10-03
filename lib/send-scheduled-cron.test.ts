import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/admin", () => ({
  requireServiceRoleClient: vi.fn(() => ({})),
}))
vi.mock("@/lib/card-send-schedule", () => ({
  claimDueSends: vi.fn(),
  deliverScheduledSend: vi.fn(),
}))

import { GET } from "@/app/api/cron/send-scheduled/route"
import {
  claimDueSends,
  deliverScheduledSend,
  type DueSend,
} from "@/lib/card-send-schedule"

function request(authorization?: string) {
  return new NextRequest("https://cardshare.ai/api/cron/send-scheduled", {
    headers: authorization ? { authorization } : {},
  })
}

const due = (cardId: string): DueSend => ({
  card_id: cardId,
  user_id: "user-1",
  recipient_email: "mira@example.com",
  attempts: 0,
  claimed_at: "2026-10-03T12:00:00.000Z",
})

describe("send-scheduled cron", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    vi.mocked(claimDueSends).mockReset()
    vi.mocked(deliverScheduledSend).mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("refuses requests without the cron secret", async () => {
    expect((await GET(request())).status).toBe(401)
    expect((await GET(request("Bearer wrong"))).status).toBe(401)
    expect(claimDueSends).not.toHaveBeenCalled()
  })

  it("refuses every request when CRON_SECRET isn't set", async () => {
    vi.stubEnv("CRON_SECRET", "")
    expect((await GET(request("Bearer "))).status).toBe(401)
    expect(claimDueSends).not.toHaveBeenCalled()
  })

  it("delivers each due send and counts the outcomes", async () => {
    vi.mocked(claimDueSends).mockResolvedValue([due("a"), due("b"), due("c")])
    vi.mocked(deliverScheduledSend)
      .mockResolvedValueOnce("sent")
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce("retry")
    vi.spyOn(console, "error").mockImplementationOnce(() => {})

    const res = await GET(request("Bearer s3cret"))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      due: 3,
      sent: 1,
      retry: 1,
      failed: 0,
      error: 1,
    })
  })
})
