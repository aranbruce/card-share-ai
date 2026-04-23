import { expect, test } from "@playwright/test"

test.describe("authenticated dashboard", () => {
  test("shows dashboard heading when logged in", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { name: "All cards" })).toBeVisible()
  })
})
