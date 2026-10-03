import { describe, expect, it } from "vitest"
import { shareAppUrls } from "@/lib/share-app-urls"

const content = {
  link: "https://cardshare.ai/contribute/abc",
  message: "Help sign Mira's card! Add your message here:",
  emailSubject: "Sign Mira's card",
}

describe("shareAppUrls", () => {
  it("fills each app with the message and link", () => {
    const urls = shareAppUrls(content)
    const text = `${content.message} ${content.link}`

    expect(urls.whatsapp).toBe(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
    )
    expect(urls.messages).toBe(`sms:?&body=${encodeURIComponent(text)}`)
    expect(new URL(urls.telegram).searchParams.get("url")).toBe(content.link)
    expect(new URL(urls.telegram).searchParams.get("text")).toBe(
      content.message,
    )
  })

  it("puts the link on its own line in emails", () => {
    const email = new URL(shareAppUrls(content).email)
    expect(email.protocol).toBe("mailto:")
    expect(email.searchParams.get("subject")).toBe("Sign Mira's card")
    expect(email.searchParams.get("body")).toBe(
      `${content.message}\n\n${content.link}`,
    )
  })

  it("escapes characters that would break the links", () => {
    const urls = shareAppUrls({
      ...content,
      message: "Tom & Jerry's card #1?",
    })
    expect(urls.whatsapp).not.toContain("&J")
    expect(urls.whatsapp).not.toContain("#")
    expect(new URL(urls.telegram).searchParams.get("text")).toBe(
      "Tom & Jerry's card #1?",
    )
  })
})
