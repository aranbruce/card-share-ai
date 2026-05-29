import {
  buildAuthSecurityNotificationEmail,
  buildEmailChangeEmail,
  buildEmailVerificationEmail,
  buildInviteEmail,
  buildMagicLinkEmail,
  buildPasswordResetEmail,
  buildReauthenticationEmail,
  type EmailContent,
} from "@/lib/email/messages"
import { sendEmailViaResend, type SendEmailResult } from "@/lib/email/resend"

export type SupabaseEmailData = {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
  token_new: string
  token_hash_new: string
}

export type SupabaseAuthEmailUser = {
  email: string
  new_email?: string
}

export type AuthEmailDelivery = {
  to: string
  content: EmailContent
}

const SECURITY_NOTIFICATIONS = {
  password_changed_notification: {
    subject: "Your CardShareAI password was changed",
    heading: "Password changed",
    body: "Your CardShareAI password was recently changed. If you made this change, no action is needed. If you did not change your password, reset it or contact support immediately.",
    footerNote:
      "You received this because the password on your CardShareAI account was changed.",
  },
  email_changed_notification: {
    subject: "Your CardShareAI email was changed",
    heading: "Email address changed",
    body: "The email address on your CardShareAI account was recently changed. If you made this change, no action is needed.",
    footerNote:
      "You received this because the email address on your CardShareAI account was changed.",
  },
  phone_changed_notification: {
    subject: "Your CardShareAI phone number was changed",
    heading: "Phone number changed",
    body: "The phone number on your CardShareAI account was recently changed. If you made this change, no action is needed.",
    footerNote:
      "You received this because the phone number on your CardShareAI account was changed.",
  },
  identity_linked_notification: {
    subject: "A sign-in method was linked to CardShareAI",
    heading: "Sign-in method linked",
    body: "A new sign-in method was linked to your CardShareAI account. If you made this change, no action is needed.",
    footerNote:
      "You received this because a sign-in method was linked to your CardShareAI account.",
  },
  identity_unlinked_notification: {
    subject: "A sign-in method was removed from CardShareAI",
    heading: "Sign-in method removed",
    body: "A sign-in method was removed from your CardShareAI account. If you made this change, no action is needed.",
    footerNote:
      "You received this because a sign-in method was removed from your CardShareAI account.",
  },
  mfa_factor_enrolled_notification: {
    subject: "Multi-factor authentication enabled",
    heading: "MFA enabled",
    body: "Multi-factor authentication was enabled on your CardShareAI account. If you made this change, no action is needed.",
    footerNote:
      "You received this because multi-factor authentication was enabled on your CardShareAI account.",
  },
  mfa_factor_unenrolled_notification: {
    subject: "Multi-factor authentication disabled",
    heading: "MFA disabled",
    body: "Multi-factor authentication was disabled on your CardShareAI account. If you did not make this change, secure your account immediately.",
    footerNote:
      "You received this because multi-factor authentication was disabled on your CardShareAI account.",
  },
} as const

type SecurityNotificationType = keyof typeof SECURITY_NOTIFICATIONS

const HANDLED_AUTH_EMAIL_TYPES = new Set<string>([
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
  "reauthentication",
  ...Object.keys(SECURITY_NOTIFICATIONS),
])

export function buildSupabaseAuthLink(
  emailData: SupabaseEmailData,
  tokenHash: string = emailData.token_hash,
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }

  const baseUrl = `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify`
  const params = new URLSearchParams({
    token: tokenHash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  })

  return `${baseUrl}?${params.toString()}`
}

function buildLinkAuthEmailContent(
  emailData: SupabaseEmailData,
  tokenHash: string,
): EmailContent {
  const link = buildSupabaseAuthLink(emailData, tokenHash)

  switch (emailData.email_action_type) {
    case "signup":
    case "email":
      return buildEmailVerificationEmail({ link })
    case "recovery":
      return buildPasswordResetEmail({ link })
    case "magiclink":
      return buildMagicLinkEmail({ link })
    case "invite":
      return buildInviteEmail({ link })
    case "email_change":
      return buildEmailChangeEmail({
        link,
        newEmail: undefined,
      })
    default:
      throw new Error(
        `Unsupported link-based auth email type: ${emailData.email_action_type}`,
      )
  }
}

function resolveEmailChangeDeliveries(
  user: SupabaseAuthEmailUser,
  emailData: SupabaseEmailData,
): AuthEmailDelivery[] {
  const secureChange =
    Boolean(emailData.token_hash_new) && Boolean(emailData.token_hash)

  if (secureChange) {
    const deliveries: AuthEmailDelivery[] = [
      {
        to: user.email,
        content: buildEmailChangeEmail({
          link: buildSupabaseAuthLink(emailData, emailData.token_hash_new),
        }),
      },
    ]

    if (user.new_email) {
      deliveries.push({
        to: user.new_email,
        content: buildEmailChangeEmail({
          link: buildSupabaseAuthLink(emailData, emailData.token_hash),
          newEmail: user.new_email,
        }),
      })
    }

    return deliveries
  }

  const recipient = user.new_email ?? user.email
  const tokenHash = emailData.token_hash || emailData.token_hash_new

  return [
    {
      to: recipient,
      content: buildEmailChangeEmail({
        link: buildSupabaseAuthLink(emailData, tokenHash),
        newEmail: user.new_email,
      }),
    },
  ]
}

export function resolveAuthEmailDeliveries(
  user: SupabaseAuthEmailUser,
  emailData: SupabaseEmailData,
): AuthEmailDelivery[] | null {
  switch (emailData.email_action_type) {
    case "signup":
    case "email":
    case "recovery":
    case "magiclink":
    case "invite":
      return [
        {
          to: user.email,
          content: buildLinkAuthEmailContent(emailData, emailData.token_hash),
        },
      ]
    case "email_change":
      return resolveEmailChangeDeliveries(user, emailData)
    case "reauthentication":
      return [
        {
          to: user.email,
          content: buildReauthenticationEmail({ token: emailData.token }),
        },
      ]
    case "password_changed_notification":
    case "email_changed_notification":
    case "phone_changed_notification":
    case "identity_linked_notification":
    case "identity_unlinked_notification":
    case "mfa_factor_enrolled_notification":
    case "mfa_factor_unenrolled_notification":
      const template =
        SECURITY_NOTIFICATIONS[
          emailData.email_action_type as SecurityNotificationType
        ]
      return [
        {
          to: user.email,
          content: buildAuthSecurityNotificationEmail(template),
        },
      ]
    default:
      return null
  }
}

export function isHandledAuthEmailType(emailActionType: string): boolean {
  return HANDLED_AUTH_EMAIL_TYPES.has(emailActionType)
}

export async function sendAuthEmail({
  user,
  emailData,
}: {
  user: SupabaseAuthEmailUser
  emailData: SupabaseEmailData
}): Promise<SendEmailResult> {
  const deliveries = resolveAuthEmailDeliveries(user, emailData)
  if (!deliveries?.length) {
    return {
      ok: false,
      error: `Unsupported auth email type: ${emailData.email_action_type}`,
    }
  }

  let lastId: string | null = null
  for (const { to, content } of deliveries) {
    const result = await sendEmailViaResend({ to, ...content })
    if (!result.ok) return result
    lastId = result.id
  }

  return { ok: true, id: lastId }
}
