import { expect, test } from "@playwright/test"

test.describe("email link confirm page", () => {
  test("waits for a click before posting the token to the callback", async ({
    page,
  }) => {
    const callbackPosts: string[] = []
    page.on("request", (request) => {
      const { pathname } = new URL(request.url())
      if (request.method() === "POST" && pathname.endsWith("callback")) {
        callbackPosts.push(pathname)
      }
    })

    await page.goto(
      "/confirm?token_hash=not-a-real-token&type=email&next=%2Fcreate%3Faction%3Dsave",
    )

    await expect(
      page.getByRole("heading", { name: "Confirm your email" }),
    ).toBeVisible()
    // Loading the page (as an email scanner would) must not redeem the token.
    expect(callbackPosts).toEqual([])

    const form = page.locator("form")
    await expect(form).toHaveAttribute("action", "/callback")
    await expect(form.locator('input[name="next"]')).toHaveValue(
      "/create?action=save",
    )

    await page.getByRole("button", { name: "Confirm email" }).click()

    // The fake token is rejected by Supabase as expired/invalid, so we land on
    // login with the explanation rather than Supabase's raw message.
    await expect(page).toHaveURL(/\/login\?error=/)
    await expect(
      page.getByText(
        "This confirmation link has expired or was already used. If you've already confirmed your email, sign in below.",
      ),
    ).toBeVisible()
    expect(callbackPosts).toEqual(["/callback"])
  })

  test("posts recovery tokens to the recovery callback", async ({ page }) => {
    await page.goto("/confirm?token_hash=abc&type=recovery")

    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible()
    await expect(page.locator("form")).toHaveAttribute(
      "action",
      "/recovery-callback",
    )
  })

  test("shows an error for incomplete links", async ({ page }) => {
    await page.goto("/confirm?type=signup")

    await expect(
      page.getByRole("heading", { name: "Link not valid" }),
    ).toBeVisible()
    await expect(page.locator("form")).toHaveCount(0)
  })
})
