import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Redeems real email-link tokens end to end. Users are created with the admin
 * API (generateLink sends no email) in a browser that never started sign-up,
 * which is the cross-browser case the PKCE links failed on. Each test deletes
 * its user afterwards. Skipped without a service role key.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe("email link sign-in with a real token", () => {
  test.skip(
    !url || !serviceRoleKey,
    "Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  )

  let admin: SupabaseClient
  let userId: string | undefined

  test.beforeEach(() => {
    admin = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    userId = undefined
  })

  test.afterEach(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  function testEmail() {
    return `e2e-email-link-${randomUUID()}@example.com`
  }

  test("confirming a sign-up signs the user in", async ({ page }) => {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email: testEmail(),
      password: randomUUID(),
    })
    expect(error).toBeNull()
    userId = data.user?.id

    await page.goto(
      `/confirm?token_hash=${data.properties?.hashed_token}&type=email`,
    )
    await page.getByRole("button", { name: "Confirm email" }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { name: "All cards" })).toBeVisible()
  })

  test("a reset link opens set-new-password with a session", async ({
    page,
  }) => {
    const email = testEmail()
    const created = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    })
    expect(created.error).toBeNull()
    userId = created.data.user?.id

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    })
    expect(error).toBeNull()

    await page.goto(
      `/confirm?token_hash=${data.properties?.hashed_token}&type=recovery`,
    )
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(page).toHaveURL(/\/reset-password$/)
    await expect(
      page.getByRole("heading", { name: "Set New Password" }),
    ).toBeVisible()
  })
})
