import { Resend } from "resend"
import {
  buildContributorInviteEmail,
  buildRecipientCardEmail,
  type EmailContent,
} from "@/lib/email/messages"

export {
  buildContributorInviteHtml,
  buildRecipientCardHtml,
} from "@/lib/email/messages"
export {
  assertSafeHttpUrl,
  escapeHtml,
  sanitizeEmailHeaderValue,
} from "@/lib/email/utils"

type SendEmailInput = {
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

function toSendEmailError(error: unknown): SendEmailResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Failed to send email",
  }
}

export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<SendEmailResult> {
  try {
    const resend = getResendClient()
    const from = getFromEmail()
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    })
    return toResult(data, error)
  } catch (error) {
    return toSendEmailError(error)
  }
}

async function sendEmailWithContent(
  to: string,
  buildContent: () => EmailContent,
): Promise<SendEmailResult> {
  try {
    const content = buildContent()
    return sendEmailViaResend({ to, ...content })
  } catch (error) {
    return toSendEmailError(error)
  }
}

export async function sendRecipientCardEmail({
  to,
  recipientName,
  senderName,
  link,
}: SendEmailInput): Promise<SendEmailResult> {
  return sendEmailWithContent(to, () =>
    buildRecipientCardEmail({ recipientName, senderName, link }),
  )
}

export async function sendContributorInviteEmail({
  to,
  recipientName,
  senderName,
  link,
}: SendEmailInput): Promise<SendEmailResult> {
  return sendEmailWithContent(to, () =>
    buildContributorInviteEmail({ recipientName, senderName, link }),
  )
}
