import { describe, expect, it } from "vitest"
import {
  buildScheduledSendDeliveredEmail,
  buildScheduledSendFailedEmail,
} from "@/lib/email/messages"

const link = "https://cardshare.ai/dashboard/cards/card-1"

describe("scheduled send emails to the owner", () => {
  it("says the card was delivered, and links to it", () => {
    const email = buildScheduledSendDeliveredEmail({
      recipientName: "Mira",
      link,
    })
    expect(email.subject).toBe("Your card to Mira was delivered")
    expect(email.text).toContain("emailed to Mira as scheduled")
    // Signing stays open after the send
    expect(email.text).toContain("Messages can still be added")
    expect(email.html).toContain(link)
  })

  it("says the card wasn't sent, and how to send it by hand", () => {
    const email = buildScheduledSendFailedEmail({
      recipientName: "Mira",
      link,
    })
    expect(email.subject).toBe("Your card to Mira wasn't sent")
    expect(email.text).toContain("Check their email address")
    expect(email.html).toContain("Send it now")
  })

  it("escapes names in the HTML and keeps them out of header injection", () => {
    const email = buildScheduledSendDeliveredEmail({
      recipientName: '<img src=x onerror="alert(1)">\r\nBcc: x@evil.test',
      link,
    })
    expect(email.html).not.toContain("<img src=x")
    expect(email.html).toContain("&lt;img")
    expect(email.subject).not.toMatch(/[\r\n]/)
  })
})
