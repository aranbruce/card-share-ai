import { expect, test } from "@playwright/test"

const PAGES = [
  // Claude calls what you add a connector; ChatGPT, a plugin
  {
    path: "/claude",
    name: "Claude",
    urlLabel: "Connector URL",
    other: "ChatGPT",
    otherPath: "/chatgpt",
  },
  {
    path: "/chatgpt",
    name: "ChatGPT",
    urlLabel: "Plugin URL",
    other: "Claude",
    otherPath: "/claude",
  },
]

for (const page of PAGES) {
  test.describe(`${page.name} connector page`, () => {
    test("shows the setup, copies the URL and links the other assistant", async ({
      page: browser,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"])
      await browser.goto(page.path)

      await expect(
        browser.getByRole("heading", {
          level: 1,
          name: `Use CardShare.ai in ${page.name}`,
        }),
      ).toBeVisible()

      // The demo's steps can be picked
      const schedule = browser.getByRole("button", {
        name: /Schedule the send/,
      })
      await schedule.click()
      await expect(schedule).toHaveAttribute("aria-pressed", "true")

      await browser.getByRole("link", { name: "Set it up" }).click()
      await expect(
        browser.getByRole("heading", { name: "Set it up" }),
      ).toBeInViewport()
      await expect(
        browser.getByRole("textbox", { name: page.urlLabel }),
      ).toHaveValue("https://www.cardshare.ai/mcp")
      await browser.getByRole("button", { name: /Copy link/ }).click()
      await expect
        .poll(() => browser.evaluate(() => navigator.clipboard.readText()))
        .toBe("https://www.cardshare.ai/mcp")

      await expect(
        browser.getByRole("link", {
          name: `Add CardShare.ai to ${page.other}`,
        }),
      ).toHaveAttribute("href", page.otherPath)
    })
  })
}
