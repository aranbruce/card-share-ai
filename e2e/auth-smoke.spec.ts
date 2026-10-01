import { expect, test } from "@playwright/test"

test.describe("auth smoke flows", () => {
  test("shows sign-up-success content and home link", async ({ page }) => {
    await page.goto("/sign-up-success")

    await expect(
      page.getByRole("heading", { name: "Check Your Email" }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Return Home" }),
    ).toHaveAttribute("href", "/")
    await expect(page.getByRole("link", { name: "sign in" })).toHaveAttribute(
      "href",
      "/login",
    )
  })

  test("shows reset-password-success and sign-in link", async ({ page }) => {
    await page.goto("/reset-password-success")

    await expect(
      page.getByRole("heading", { name: "Password updated" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    )
  })

  test("redirects unauthenticated dashboard access to login with return path", async ({
    page,
  }) => {
    await page.goto("/dashboard/cards/example-card-id")

    await expect(page).toHaveURL(
      /\/login\?redirect=%2Fdashboard%2Fcards%2Fexample-card-id$/,
    )
  })

  test("navigates from auth error page back to login", async ({ page }) => {
    await page.goto("/error")

    await expect(
      page.getByRole("heading", { name: "Authentication Error" }),
    ).toBeVisible()
    await page.getByRole("link", { name: "Back to sign in" }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole("heading", { name: "Welcome Back" }),
    ).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
  })
})
