import { writeFile } from "node:fs/promises"

import { Buffer } from "node:buffer"
import { expect, test } from "@playwright/test"
import { MAX_UPLOAD_FILE_BYTES } from "../lib/source-image-limits"
import { IMAGE_TOO_LARGE_ERROR } from "../lib/handle-image-file-change"

// 1x1 transparent GIF — minimal valid image for upload tests
const TINY_GIF_BASE64 =
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
const TINY_GIF_BUFFER = Buffer.from(TINY_GIF_BASE64, "base64")
const STUB_IMAGE_URL = `data:image/gif;base64,${TINY_GIF_BASE64}`

async function goToCoverStep(page: import("@playwright/test").Page) {
  await page.goto("/create")
  await page.getByRole("radio", { name: /Birthday/i }).click()
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("heading", { name: /the cover/i })).toBeVisible()
}

async function fillDetailsAndGenerate(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("heading", { name: /Tell us/i })).toBeVisible()
  await page.getByRole("textbox", { name: "To" }).fill("Test Recipient")
  await page.getByRole("textbox", { name: "From" }).fill("Test Sender")
  await page.getByRole("button", { name: /Generate card/i }).click()
}

test.describe("image upload — reference photo", () => {
  test("shows preview after attaching a photo", async ({ page }) => {
    await goToCoverStep(page)

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
    await page.route("**/api/generate-headline", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "Happy Birthday!",
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

    await goToCoverStep(page)

    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.gif",
      mimeType: "image/gif",
      buffer: TINY_GIF_BUFFER,
    })

    // Wait for the async canvas encoding to complete before submitting
    await expect(page.getByAltText("Reference")).toBeVisible()

    await fillDetailsAndGenerate(page)
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
      timeout: 15_000,
    })

    expect(capturedAttachedImageUrl).toMatch(/^data:image\/jpeg;base64,/)
  })

  test("shows error and no preview when file exceeds the upload limit", async ({
    page,
  }, testInfo) => {
    await goToCoverStep(page)

    // Playwright caps in-memory buffers at 50 MB, so pass a file on disk
    const bigFile = testInfo.outputPath("big.jpg")
    await writeFile(bigFile, Buffer.alloc(MAX_UPLOAD_FILE_BYTES + 1))
    await page.locator('input[type="file"]').setInputFiles(bigFile)

    await expect(page.getByText(IMAGE_TOO_LARGE_ERROR)).toBeVisible()
    await expect(page.getByAltText("Reference")).not.toBeVisible()
  })

  test("omits attachedImageUrl from generate-image when no photo is attached", async ({
    page,
  }) => {
    await page.route("**/api/generate-headline", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "Happy Birthday!",
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

    await goToCoverStep(page)
    await fillDetailsAndGenerate(page)
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
      timeout: 15_000,
    })

    expect(capturedBody).not.toHaveProperty("attachedImageUrl")
  })
})
