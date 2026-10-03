import { expect, test } from "@playwright/test"

// 1x1 transparent GIF, so the card needs no real image generation
const STUB_IMAGE_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

test.describe("scheduled send API", () => {
  test("schedules a real send, shows the deadline to signers, and cancels it", async ({
    page,
  }) => {
    test.setTimeout(30_000)

    const created = await page.request.post("/api/cards", {
      data: {
        cardType: "birthday",
        recipientName: `E2E ${Date.now()}`,
        senderName: "E2E Sender",
        copyHeadline: "Happy Birthday!",
        imageUrl: STUB_IMAGE_URL,
      },
    })
    expect(created.ok()).toBeTruthy()
    const { card } = (await created.json()) as {
      card: { id: string; contributor_link_id: string }
    }

    try {
      // Far ahead, to an address that can't receive mail, so a leftover schedule is harmless;
      // deleting the card below also deletes its schedule.
      const sendAt = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000)
      sendAt.setUTCMinutes(0, 0, 0)

      const refused = await page.request.post(
        `/api/cards/${card.id}/schedule`,
        { data: { email: "not-an-email", sendAt: sendAt.toISOString() } },
      )
      expect(refused.status()).toBe(400)

      const scheduled = await page.request.post(
        `/api/cards/${card.id}/schedule`,
        {
          data: {
            email: "e2e-schedule@example.com",
            sendAt: sendAt.toISOString(),
          },
        },
      )
      expect(scheduled.ok()).toBeTruthy()
      const { schedule } = await scheduled.json()
      expect(schedule).toMatchObject({
        recipient_email: "e2e-schedule@example.com",
        state: "scheduled",
      })
      expect(new Date(schedule.send_at).getTime()).toBe(sendAt.getTime())

      // Signers see when the card goes
      await page.goto(`/contribute/${card.contributor_link_id}`)
      await expect(page.getByText(/^Sign by/)).toBeVisible()
      await expect(page.getByText(/when the card is sent to E2E/)).toBeVisible()

      // The owner's card page shows it too
      await page.goto(`/dashboard/cards/${card.id}`)
      await expect(page.getByText(/Scheduled to send on/)).toBeVisible()

      const cancelled = await page.request.delete(
        `/api/cards/${card.id}/schedule`,
      )
      expect(await cancelled.json()).toEqual({ ok: true, cancelled: true })

      await page.goto(`/contribute/${card.contributor_link_id}`)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(page.getByText(/^Sign by/)).toHaveCount(0)
    } finally {
      await page.request.delete(`/api/cards/${card.id}`)
    }
  })
})
