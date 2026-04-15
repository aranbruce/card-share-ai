import { expect, test } from "@playwright/test"

test.describe("card create and delete", () => {
  test("creates a card from the UI and deletes it from the dashboard", async ({
    page,
  }) => {
    test.setTimeout(180_000)

    const recipient = `E2E ${Date.now()}`
    const sender = "E2E Sender"

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "My Cards" })).toBeVisible()

    await page
      .getByRole("link", { name: /Create (New Card|Your First Card)/ })
      .click()
    await expect(
      page.getByRole("heading", { name: "Create a Card" }),
    ).toBeVisible()

    await page.getByRole("button", { name: /Birthday/i }).click()
    await expect(
      page.getByRole("heading", { name: "Card Details" }),
    ).toBeVisible()

    await page.getByLabel(/From \(Your Name\)/).fill(sender)
    await page.getByLabel(/To \(Recipient Name\)/).fill(recipient)

    await page.getByRole("button", { name: "Generate Card" }).click()
    await expect(page.getByRole("heading", { name: "Your Card" })).toBeVisible({
      timeout: 120_000,
    })

    await Promise.all([
      page.waitForURL(/\/dashboard\/cards\/[^/?]+/),
      page.getByRole("button", { name: "Write message" }).click(),
    ])

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "My Cards" })).toBeVisible()

    const cardRow = page
      .locator("div.group.relative")
      .filter({ hasText: recipient })
    await expect(
      cardRow.getByRole("heading", { name: `For ${recipient}` }),
    ).toBeVisible()

    page.once("dialog", (d) => d.accept())
    await cardRow.getByRole("button", { name: "Delete" }).click()

    await expect(
      page.getByRole("heading", { name: `For ${recipient}` }),
    ).toHaveCount(0)
  })
})
