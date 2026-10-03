import { expect, test } from "@playwright/test"

// 1x1 transparent GIF, so the card needs no real image generation
const STUB_IMAGE_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

test.describe("scheduled send", () => {
  test("schedules and cancels emailing the card from the send dialog", async ({
    page,
  }) => {
    test.setTimeout(30_000)

    const recipient = `E2E ${Date.now()}`
    const created = await page.request.post("/api/cards", {
      data: {
        cardType: "birthday",
        recipientName: recipient,
        senderName: "E2E Sender",
        copyHeadline: "Happy Birthday!",
        imageUrl: STUB_IMAGE_URL,
      },
    })
    expect(created.ok()).toBeTruthy()
    const { card } = (await created.json()) as { card: { id: string } }

    try {
      // The schedule API is stubbed: scheduling queues a real email, and this checks the
      // dialog (the route and cron are covered by unit tests).
      let scheduledBody: { email?: string; sendAt?: string } | null = null
      await page.route(`**/api/cards/${card.id}/schedule`, async (route) => {
        if (route.request().method() === "POST") {
          scheduledBody = route.request().postDataJSON()
          await route.fulfill({
            json: {
              schedule: {
                send_at: scheduledBody?.sendAt,
                recipient_email: scheduledBody?.email,
                state: "scheduled",
                sent_at: null,
              },
            },
          })
          return
        }
        await route.fulfill({ json: { ok: true, cancelled: true } })
      })

      await page.goto(`/dashboard/cards/${card.id}`)
      await page.getByRole("button", { name: "Send to recipient" }).click()
      const dialog = page.getByRole("dialog")
      await expect(
        dialog.getByRole("heading", { name: "Schedule for later" }),
      ).toBeVisible()

      await dialog
        .getByRole("textbox", { name: "Recipient email address" })
        .fill("mira@example.com")
      await dialog.getByRole("button", { name: "Pick a date and time" }).click()
      // Defaults to 9am tomorrow
      await expect(dialog.getByLabel("Send on")).toHaveValue(/T09:00$/)
      await dialog.getByRole("button", { name: "Schedule send" }).click()

      await expect(dialog.getByText("mira@example.com")).toBeVisible()
      await expect(
        dialog.getByText(/Contributors see this as the deadline to sign/),
      ).toBeVisible()
      expect(scheduledBody).toMatchObject({ email: "mira@example.com" })
      const sendAt = new Date(scheduledBody!.sendAt!)
      expect(sendAt.getHours()).toBe(9)
      expect(sendAt.getTime()).toBeGreaterThan(Date.now())

      await dialog
        .getByRole("button", { name: "Cancel scheduled send" })
        .click()
      await expect(
        dialog.getByRole("button", { name: "Pick a date and time" }),
      ).toBeVisible()
    } finally {
      await page.request.delete(`/api/cards/${card.id}`)
    }
  })
})
