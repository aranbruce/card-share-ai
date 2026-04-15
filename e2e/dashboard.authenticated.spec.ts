import { expect, test } from "@playwright/test"

test.describe("authenticated dashboard", () => {
  test("shows dashboard heading when logged in", async ({ page }) => {
    test.skip(
      !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
      "Set E2E_EMAIL and E2E_PASSWORD to run authenticated tests.",
    )

    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { name: "My Cards" })).toBeVisible()
  })
})
