import { expect, test } from "@playwright/test"

// 1x1 transparent GIF, so the card needs no real image generation
const STUB_IMAGE_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

test.describe("share to apps", () => {
  test("offers app share links for contributors and the recipient", async ({
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
    const { card } = (await created.json()) as {
      card: { id: string; contributor_link_id: string }
    }

    try {
      await page.goto(`/dashboard/cards/${card.id}`)

      // Contributors: the sign link, with a nudge to sign
      await page
        .getByRole("button", { name: "Share with contributors" })
        .click()
      let dialog = page.getByRole("dialog")
      let apps = dialog.getByRole("group", { name: "Share to an app" })
      const whatsapp = await apps
        .getByRole("link", { name: "WhatsApp" })
        .getAttribute("href")
      const whatsappText = new URL(whatsapp!).searchParams.get("text")
      expect(whatsappText).toContain(`Help sign ${recipient}'s card!`)
      expect(whatsappText).toContain(`/contribute/${card.contributor_link_id}`)
      await expect(
        apps.getByRole("link", { name: "Messages" }),
      ).toHaveAttribute("href", /^sms:/)
      await expect(apps.getByRole("link", { name: "Email" })).toHaveAttribute(
        "href",
        /^mailto:/,
      )
      await page.keyboard.press("Escape")

      // Recipient: the view link, from the "Share a link" screen
      await page.getByRole("button", { name: "Send to recipient" }).click()
      dialog = page.getByRole("dialog")
      await dialog.getByRole("button", { name: /Share a link/ }).click()
      apps = dialog.getByRole("group", { name: "Share to an app" })
      const telegram = await apps
        .getByRole("link", { name: "Telegram" })
        .getAttribute("href")
      expect(new URL(telegram!).searchParams.get("url")).toContain(
        `/view/${card.contributor_link_id}`,
      )
      // Sharing to an app counts as sending the card, like copying the link
      const recorded = page.waitForRequest(
        (req) =>
          req.method() === "PATCH" &&
          req.url().endsWith(`/api/cards/${card.id}`),
      )
      await page.route("https://wa.me/**", (route) => route.abort())
      await apps.getByRole("link", { name: "WhatsApp" }).click()
      expect((await recorded).postDataJSON()).toHaveProperty("sent_at")
    } finally {
      await page.request.delete(`/api/cards/${card.id}`)
    }
  })
})
