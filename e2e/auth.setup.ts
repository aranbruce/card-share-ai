import { expect, test } from "@playwright/test"
import path from "node:path"

const authFile = path.resolve(__dirname, "./.auth/user.json")

test("authenticate via login form", async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD are required to run authenticated E2E tests.",
    )
  }

  await page.goto("/auth/login")
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible()

  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: /log in/i }).click()

  await expect(page).toHaveURL(/\/dashboard(\/|$)/)
  await expect(page.getByRole("heading", { name: "My Cards" })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
