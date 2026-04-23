import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { expect, test } from "@playwright/test"

const authFile = resolve(process.cwd(), "playwright/.auth/user.json")

test("authenticate via login form", async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD are required to run authenticated E2E tests.",
    )
  }

  await page.goto("/auth/login")
  await expect(
    page.getByRole("heading", { name: /welcome back/i }),
  ).toBeVisible()

  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/dashboard(\/|$)/)
  await expect(page.getByRole("heading", { name: "All cards" })).toBeVisible()

  mkdirSync(dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
