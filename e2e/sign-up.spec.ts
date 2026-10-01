import { expect, test, type Page } from "@playwright/test"

/**
 * Stubs Supabase's /signup response so no real account or email is created.
 * Without an access_token, supabase-js returns the user with a null session,
 * which is what happens when email confirmation is required.
 */
async function stubSignUp(
  page: Page,
  user: { identities: Array<Record<string, unknown>> },
) {
  const requests: Array<{ redirectTo: string | null }> = []
  await page.route("**/auth/v1/signup**", async (route) => {
    requests.push({
      redirectTo: new URL(route.request().url()).searchParams.get(
        "redirect_to",
      ),
    })
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        aud: "authenticated",
        role: "",
        email: "new-user@example.com",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        created_at: new Date().toISOString(),
        ...user,
      }),
    })
  })
  return requests
}

async function submitSignUp(page: Page, buttonName = "Create account") {
  await page.getByLabel("Email").fill("new-user@example.com")
  await page.getByLabel("Password").fill("a-long-test-password")
  await page.getByRole("button", { name: buttonName }).click()
}

test.describe("email sign-up", () => {
  test("shows check-your-email when confirmation is required", async ({
    page,
  }) => {
    const requests = await stubSignUp(page, {
      identities: [{ id: "identity-1", provider: "email" }],
    })

    await page.goto("/sign-up")
    await submitSignUp(page)

    await expect(page).toHaveURL(/\/sign-up-success$/)
    await expect(
      page.getByRole("heading", { name: "Check Your Email" }),
    ).toBeVisible()
    expect(requests).toHaveLength(1)
    expect(new URL(requests[0].redirectTo ?? "").pathname).toBe("/callback")
  })

  test("shows check-your-email for an already registered email", async ({
    page,
  }) => {
    await stubSignUp(page, { identities: [] })

    await page.goto("/sign-up")
    await submitSignUp(page)

    await expect(page).toHaveURL(/\/sign-up-success$/)
  })

  test("returns to /create after confirming when a guest card is stored", async ({
    page,
  }) => {
    const requests = await stubSignUp(page, {
      identities: [{ id: "identity-1", provider: "email" }],
    })

    await page.goto("/sign-up")
    await page.evaluate(() =>
      localStorage.setItem(
        "pendingCard",
        JSON.stringify({
          cardType: "birthday",
          recipientName: "Sam",
          senderName: "Alex",
          copyHeadline: "Happy birthday",
          imageUrl: "https://example.com/card.png",
          extraPages: 0,
        }),
      ),
    )
    await page.reload()
    await submitSignUp(page, "Sign up & save card")

    await expect(page).toHaveURL(/\/sign-up-success$/)
    const redirectTo = new URL(requests[0].redirectTo ?? "")
    expect(redirectTo.pathname).toBe("/callback")
    expect(redirectTo.searchParams.get("next")).toBe("/create?action=save")
  })
})
