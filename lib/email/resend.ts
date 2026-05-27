import { Resend } from "resend"

type SendCardEmailInput = {
  to: string
  recipientName: string
  senderName: string
  link: string
}

type SendContributorInviteInput = {
  to: string
  recipientName: string
  senderName: string
  link: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

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
}: SendCardEmailInput): Promise<SendEmailResult> {
  try {
    const resend = getResendClient()
    const from = getFromEmail()
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `${senderName} sent you a card`,
      text: `Hi ${recipientName},\n\n${senderName} sent you a card.\n\nOpen your card: ${link}\n\nEnjoy!`,
      html: `<p>Hi ${recipientName},</p><p><strong>${senderName}</strong> sent you a card.</p><p><a href="${link}">Open your card</a></p><p>Enjoy!</p>`,
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
}: SendContributorInviteInput): Promise<SendEmailResult> {
  try {
    const resend = getResendClient()
    const from = getFromEmail()
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Contribute to ${recipientName}'s card`,
      text: `Hi there,\n\n${senderName} invited you to contribute to ${recipientName}'s card.\n\nAdd your message: ${link}\n\nThanks!`,
      html: `<p>Hi there,</p><p><strong>${senderName}</strong> invited you to contribute to ${recipientName}&apos;s card.</p><p><a href="${link}">Add your message</a></p><p>Thanks!</p>`,
    })
    return toResult(data, error)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}
