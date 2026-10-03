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
      // First screen: the three ways to send
      await expect(
        dialog.getByRole("button", { name: /Share a link/ }),
      ).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: /Send by email/ }),
      ).toBeVisible()
      await dialog.getByRole("button", { name: /Schedule for later/ }).click()
      await expect(
        dialog.getByRole("heading", { name: "Schedule for later" }),
      ).toBeVisible()

      await dialog
        .getByRole("textbox", { name: `${recipient}'s email` })
        .fill("mira@example.com")
      await expect(dialog.getByText(/^Times are in /)).toBeVisible()
      // Defaults to 9am tomorrow, in whole hours
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const pad = (n: number) => String(n).padStart(2, "0")
      await expect(dialog.getByLabel("Send on")).toHaveValue(
        `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
      )
      await expect(dialog.getByLabel("At")).toHaveValue("9")
      await expect(dialog.getByLabel("At").locator("option")).toHaveCount(24)
      await dialog.getByRole("button", { name: "Schedule send" }).click()

      await expect(dialog.getByText("mira@example.com")).toBeVisible()
      await expect(
        dialog.getByText(/Contributors are asked to sign by then\.$/),
      ).toBeVisible()
      expect(scheduledBody).toMatchObject({ email: "mira@example.com" })
      const sendAt = new Date(scheduledBody!.sendAt!)
      expect(sendAt.getHours()).toBe(9)
      expect(sendAt.getMinutes()).toBe(0)
      expect(sendAt.getTime()).toBeGreaterThan(Date.now())

      // Back on the first screen, the option shows the pending send
      await dialog.getByRole("button", { name: "Back" }).click()
      await expect(
        dialog.getByRole("button", { name: /Scheduled for/ }),
      ).toBeVisible()
      await dialog.getByRole("button", { name: /Schedule for later/ }).click()

      await dialog
        .getByRole("button", { name: "Cancel scheduled send" })
        .click()
      await expect(
        dialog.getByRole("button", { name: "Schedule send" }),
      ).toBeVisible()
    } finally {
      await page.request.delete(`/api/cards/${card.id}`)
    }
  })
})
