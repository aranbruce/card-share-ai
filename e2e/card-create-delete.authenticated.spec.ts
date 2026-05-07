import { expect, test } from "@playwright/test"

// 1x1 transparent GIF — avoids real image generation while keeping a valid data URL
const STUB_IMAGE_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

test.describe("card create and delete", () => {
  test("creates a card from the UI and deletes it from the dashboard", async ({
    page,
  }) => {
    test.setTimeout(30_000)

    // Mock the slow AI routes so the test runs in seconds, not minutes.
    // The card save (POST /api/cards) is NOT mocked so the card is real in DB.
    await page.route("**/api/generate-card-copy", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cardCopy: {
            headline: "Happy Birthday!",
          },
        }),
      }),
    )

    await page.route("**/api/generate-image", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imageUrl: STUB_IMAGE_URL }),
      }),
    )

    const recipient = `E2E ${Date.now()}`
    const sender = "E2E Sender"

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "All cards" })).toBeVisible()

    await page
      .getByRole("link", { name: /\+ New card|Create your first card/i })
      .first()
      .click()
    await expect(
      page.getByRole("heading", { name: "What kind of card?" }),
    ).toBeVisible()

    await page.getByRole("button", { name: /Birthday/i }).click()
    // Step 2 heading is dynamic: "Tell us about who." before name is filled
    await expect(page.getByRole("heading", { name: /Tell us/i })).toBeVisible()

    await page.getByRole("textbox", { name: "To" }).fill(recipient)
    await page.getByRole("textbox", { name: "From" }).fill(sender)

    await page.getByRole("button", { name: /Generate card/i }).click()

    // Generation is instant with mocked routes — just wait for button to be enabled
    const continueButton = page.getByRole("button", { name: "Continue" })
    await expect(continueButton).toBeEnabled()

    await Promise.all([
      page.waitForURL(/\/dashboard\/cards\/[^/?]+/),
      continueButton.click(),
    ])

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "All cards" })).toBeVisible()

    const cardRow = page
      .locator("div.group.relative")
      .filter({ hasText: recipient })
    await expect(cardRow.getByText(`For ${recipient}`)).toBeVisible()

    // Hover to reveal the delete button (it's opacity-0 until hovered)
    await cardRow.hover()
    await cardRow.getByRole("button", { name: "Delete card" }).click()

    // Confirm via the inline overlay (not a browser dialog)
    await cardRow.getByRole("button", { name: "Delete" }).click()

    await expect(page.getByText(`For ${recipient}`)).toHaveCount(0)
  })
})
