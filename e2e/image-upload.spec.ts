import { Buffer } from "node:buffer"
import { expect, test } from "@playwright/test"
import { MAX_SOURCE_IMAGE_BYTES } from "../lib/source-image-limits"
import { IMAGE_TOO_LARGE_ERROR } from "../lib/handle-image-file-change"

// 1x1 transparent GIF — minimal valid image for upload tests
const TINY_GIF_BASE64 =
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
const TINY_GIF_BUFFER = Buffer.from(TINY_GIF_BASE64, "base64")
const STUB_IMAGE_URL = `data:image/gif;base64,${TINY_GIF_BASE64}`

async function goToDetailsStep(page: import("@playwright/test").Page) {
  await page.goto("/create")
  await page.getByRole("button", { name: /Birthday/i }).click()
  await expect(page.getByRole("heading", { name: /Tell us/i })).toBeVisible()
  await page.getByRole("textbox", { name: "To" }).fill("Test Recipient")
  await page.getByRole("textbox", { name: "From" }).fill("Test Sender")
}

test.describe("image upload — reference photo", () => {
  test("shows preview after attaching a photo", async ({ page }) => {
    await goToDetailsStep(page)

    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.gif",
      mimeType: "image/gif",
      buffer: TINY_GIF_BUFFER,
    })

    await expect(page.getByAltText("Reference")).toBeVisible()
  })

  test("passes attachedImageUrl to generate-image when a photo is attached", async ({
    page,
  }) => {
    await page.route("**/api/generate-card-copy", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cardCopy: {
            headline: "Happy Birthday!",
          },
        }),
      }),
    )

    let capturedAttachedImageUrl: string | undefined
    await page.route("**/api/generate-image", async (route) => {
      capturedAttachedImageUrl = route
        .request()
        .postDataJSON()?.attachedImageUrl
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imageUrl: STUB_IMAGE_URL }),
      })
    })

    await goToDetailsStep(page)

    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.gif",
      mimeType: "image/gif",
      buffer: TINY_GIF_BUFFER,
    })

    // Wait for the async FileReader to complete before submitting
    await expect(page.getByAltText("Reference")).toBeVisible()

    await page.getByRole("button", { name: /Generate card/i }).click()
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
      timeout: 15_000,
    })

    expect(capturedAttachedImageUrl).toMatch(/^data:image\/gif;base64,/)
  })

  test("shows error and no preview when file exceeds 5 MB", async ({
    page,
  }) => {
    await goToDetailsStep(page)

    await page.locator('input[type="file"]').setInputFiles({
      name: "big.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(MAX_SOURCE_IMAGE_BYTES + 1),
    })

    await expect(page.getByText(IMAGE_TOO_LARGE_ERROR)).toBeVisible()
    await expect(page.getByAltText("Reference")).not.toBeVisible()
  })

  test("omits attachedImageUrl from generate-image when no photo is attached", async ({
    page,
  }) => {
    await page.route("**/api/generate-card-copy", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cardCopy: {
            headline: "Happy Birthday!",
          },
        }),
      }),
    )

    let capturedBody: Record<string, unknown> | undefined
    await page.route("**/api/generate-image", async (route) => {
      capturedBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imageUrl: STUB_IMAGE_URL }),
      })
    })

    await goToDetailsStep(page)
    await page.getByRole("button", { name: /Generate card/i }).click()
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
      timeout: 15_000,
    })

    expect(capturedBody).not.toHaveProperty("attachedImageUrl")
  })
})
