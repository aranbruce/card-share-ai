import { expect, test } from "@playwright/test"

test.describe("auth smoke flows", () => {
  test("shows sign-up-success content and home link", async ({ page }) => {
    await page.goto("/auth/sign-up-success")

    await expect(
      page.getByRole("heading", { name: "Check Your Email" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Return Home" })).toHaveAttribute(
      "href",
      "/",
    )
  })

  test("navigates from auth error page back to login", async ({ page }) => {
    await page.goto("/auth/error")

    await expect(
      page.getByRole("heading", { name: "Authentication Error" }),
    ).toBeVisible()
    await page.getByRole("link", { name: "Back to Login" }).click()

    await expect(page).toHaveURL(/\/auth\/login$/)
    await expect(
      page.getByRole("heading", { name: "Welcome Back" }),
    ).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
  })
})
