import { Resend } from "resend"

type SendEmailInput = {
  to: string
  recipientName: string
  senderName: string
  link: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

const EMAIL_HEADER_VALUE_MAX_LENGTH = 200

export function sanitizeEmailHeaderValue(value: string): string {
  return value
    .trim()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, EMAIL_HEADER_VALUE_MAX_LENGTH)
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function assertSafeHttpUrl(link: string): string {
  let parsed: URL
  try {
    parsed = new URL(link)
  } catch {
    throw new Error("Invalid link URL")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid link URL")
  }
  return link
}

export function buildRecipientCardHtml({
  recipientName,
  senderName,
  link,
}: Omit<SendEmailInput, "to">): string {
  const safeLink = escapeHtml(assertSafeHttpUrl(link))
  const safeRecipient = escapeHtml(recipientName)
  const safeSender = escapeHtml(senderName)
  return `<p>Hi ${safeRecipient},</p><p><strong>${safeSender}</strong> sent you a card.</p><p><a href="${safeLink}">Open your card</a></p><p>Enjoy!</p>`
}

export function buildContributorInviteHtml({
  recipientName,
  senderName,
  link,
}: Omit<SendEmailInput, "to">): string {
  const safeLink = escapeHtml(assertSafeHttpUrl(link))
  const safeRecipient = escapeHtml(recipientName)
  const safeSender = escapeHtml(senderName)
  return `<p>Hi there,</p><p><strong>${safeSender}</strong> invited you to contribute to ${safeRecipient}&apos;s card.</p><p><a href="${safeLink}">Add your message</a></p><p>Thanks!</p>`
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY")
  }
  return new Resend(apiKey)
}

function getFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) {
    throw new Error("Missing RESEND_FROM_EMAIL")
  }
  return fromEmail
}

function toResult(
  data: { id: string | null } | null,
  error: { message?: string } | null,
): SendEmailResult {
  if (error) {
    return { ok: false, error: error.message ?? "Failed to send email" }
  }
  return { ok: true, id: data?.id ?? null }
}

export async function sendRecipientCardEmail({
  to,
  recipientName,
  senderName,
  link,
}: SendEmailInput): Promise<SendEmailResult> {
  try {
    const resend = getResendClient()
    const from = getFromEmail()
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `${sanitizeEmailHeaderValue(senderName)} sent you a card`,
      text: `Hi ${recipientName},\n\n${senderName} sent you a card.\n\nOpen your card: ${link}\n\nEnjoy!`,
      html: buildRecipientCardHtml({ recipientName, senderName, link }),
    })
    return toResult(data, error)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

export async function sendContributorInviteEmail({
  to,
  recipientName,
  senderName,
  link,
}: SendEmailInput): Promise<SendEmailResult> {
  try {
    const resend = getResendClient()
    const from = getFromEmail()
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Contribute to ${sanitizeEmailHeaderValue(recipientName)}'s card`,
      text: `Hi there,\n\n${senderName} invited you to contribute to ${recipientName}'s card.\n\nAdd your message: ${link}\n\nThanks!`,
      html: buildContributorInviteHtml({ recipientName, senderName, link }),
    })
    return toResult(data, error)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}
