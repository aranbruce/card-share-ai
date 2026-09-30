import { getAppUrl } from "@/lib/app-url"
import { buildEmailLayout, buildPlainTextEmail } from "@/lib/email/template"
import { escapeHtml, sanitizeEmailHeaderValue } from "@/lib/email/utils"

export type CardEmailInput = {
  recipientName: string
  senderName: string
  link: string
}

export type AuthEmailInput = {
  link: string
}

export type EmailContent = {
  subject: string
  html: string
  text: string
}

export function buildRecipientCardEmail({
  recipientName,
  senderName,
  link,
}: CardEmailInput): EmailContent {
  const safeSender = escapeHtml(senderName)
  const safeRecipient = escapeHtml(recipientName)
  const bodyHtml = `<p style="margin:0 0 12px 0;">Hi ${safeRecipient},</p><p style="margin:0;"><strong style="color:#111110;">${safeSender}</strong> made something special for you.</p>`

  const heading = `${senderName} sent you a card`
  const body = `Hi ${recipientName},\n\n${senderName} made something special for you.`

  return {
    subject: `${sanitizeEmailHeaderValue(senderName)} sent you a card`,
    html: buildEmailLayout({
      preheader: `${senderName} sent you a card. Open it now`,
      heading,
      bodyHtml,
      ctaLabel: "Open your card",
      ctaUrl: link,
      footerNote:
        "You received this because someone shared a CardShare.ai greeting card with you.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Open your card",
      ctaUrl: link,
      footerNote:
        "You received this because someone shared a CardShare.ai greeting card with you.",
    }),
  }
}

export function buildContributorInviteEmail({
  recipientName,
  senderName,
  link,
}: CardEmailInput): EmailContent {
  const safeSender = escapeHtml(senderName)
  const safeRecipient = escapeHtml(recipientName)
  const bodyHtml = `<p style="margin:0 0 12px 0;">Hi there,</p><p style="margin:0;"><strong style="color:#111110;">${safeSender}</strong> invited you to add a message to ${safeRecipient}&apos;s group card.</p>`

  const heading = `Contribute to ${recipientName}'s card`
  const body = `${senderName} invited you to add a message to ${recipientName}'s group card.`

  return {
    subject: `Contribute to ${sanitizeEmailHeaderValue(recipientName)}'s card`,
    html: buildEmailLayout({
      preheader: `${senderName} invited you to contribute to ${recipientName}'s card`,
      heading,
      bodyHtml,
      ctaLabel: "Add your message",
      ctaUrl: link,
      footerNote:
        "You received this because someone invited you to contribute to a CardShare.ai group card.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Add your message",
      ctaUrl: link,
      footerNote:
        "You received this because someone invited you to contribute to a CardShare.ai group card.",
    }),
  }
}

export function buildEmailVerificationEmail({
  link,
}: AuthEmailInput): EmailContent {
  const heading = "Verify your email"
  const body =
    "Confirm your email to finish creating your CardShare.ai account."
  const bodyHtml = `<p style="margin:0;">Confirm your email to finish creating your CardShare.ai account.</p>`

  return {
    subject: "Verify your CardShare.ai email",
    html: buildEmailLayout({
      preheader: "Confirm your email to finish creating your account",
      heading,
      bodyHtml,
      ctaLabel: "Verify email",
      ctaUrl: link,
      footerNote:
        "You received this because someone signed up for CardShare.ai with this email address.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Verify email",
      ctaUrl: link,
      footerNote:
        "You received this because someone signed up for CardShare.ai with this email address.",
    }),
  }
}

export function buildMagicLinkEmail({ link }: AuthEmailInput): EmailContent {
  const heading = "Sign in to CardShare.ai"
  const body =
    "Use the link below to sign in. It expires shortly and can only be used once."
  const bodyHtml = `<p style="margin:0;">Use the link below to sign in. It expires shortly and can only be used once.</p>`

  return {
    subject: "Your CardShare.ai sign-in link",
    html: buildEmailLayout({
      preheader: "Sign in to CardShare.ai",
      heading,
      bodyHtml,
      ctaLabel: "Sign in",
      ctaUrl: link,
      footerNote:
        "You received this because a sign-in was requested for your CardShare.ai account.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Sign in",
      ctaUrl: link,
      footerNote:
        "You received this because a sign-in was requested for your CardShare.ai account.",
    }),
  }
}

export function buildInviteEmail({ link }: AuthEmailInput): EmailContent {
  const heading = "You're invited to CardShare.ai"
  const body = "You've been invited to create a CardShare.ai account."
  const bodyHtml = `<p style="margin:0;">You&apos;ve been invited to create a CardShare.ai account.</p>`

  return {
    subject: "You're invited to CardShare.ai",
    html: buildEmailLayout({
      preheader: "Accept your CardShare.ai invitation",
      heading,
      bodyHtml,
      ctaLabel: "Accept invitation",
      ctaUrl: link,
      footerNote:
        "You received this because someone invited you to join CardShare.ai.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Accept invitation",
      ctaUrl: link,
      footerNote:
        "You received this because someone invited you to join CardShare.ai.",
    }),
  }
}

export function buildEmailChangeEmail({
  link,
  newEmail,
}: AuthEmailInput & { newEmail?: string }): EmailContent {
  const safeNewEmail = newEmail ? escapeHtml(newEmail) : "your new address"
  const heading = "Confirm your new email"
  const body = newEmail
    ? `Confirm ${newEmail} as the new email for your CardShare.ai account.`
    : "Confirm your new email address for your CardShare.ai account."
  const bodyHtml = newEmail
    ? `<p style="margin:0;">Confirm <strong style="color:#111110;">${safeNewEmail}</strong> as the new email for your CardShare.ai account.</p>`
    : `<p style="margin:0;">Confirm your new email address for your CardShare.ai account.</p>`

  return {
    subject: "Confirm your new CardShare.ai email",
    html: buildEmailLayout({
      preheader: "Confirm your new email address",
      heading,
      bodyHtml,
      ctaLabel: "Confirm email",
      ctaUrl: link,
      footerNote:
        "You received this because an email change was requested for your CardShare.ai account.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Confirm email",
      ctaUrl: link,
      footerNote:
        "You received this because an email change was requested for your CardShare.ai account.",
    }),
  }
}

export function buildReauthenticationEmail({
  token,
}: {
  token: string
}): EmailContent {
  const heading = "Your verification code"
  const body = `Use this code to continue: ${token}\n\nIt expires shortly.`
  const bodyHtml = `<p style="margin:0 0 12px 0;">Use this code to continue:</p><p style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.2em;color:#111110;">${escapeHtml(token)}</p><p style="margin:12px 0 0 0;">It expires shortly.</p>`
  const appUrl = getAppUrl()

  return {
    subject: "Your CardShare.ai verification code",
    html: buildEmailLayout({
      preheader: "Your CardShare.ai verification code",
      heading,
      bodyHtml,
      ctaLabel: "Open CardShare.ai",
      ctaUrl: appUrl,
      footerNote:
        "You received this because additional verification was requested for your CardShare.ai account.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Open CardShare.ai",
      ctaUrl: appUrl,
      footerNote:
        "You received this because additional verification was requested for your CardShare.ai account.",
    }),
  }
}

export type AuthSecurityNotificationInput = {
  subject: string
  heading: string
  body: string
  footerNote: string
}

export function buildAuthSecurityNotificationEmail({
  subject,
  heading,
  body,
  footerNote,
}: AuthSecurityNotificationInput): EmailContent {
  const bodyHtml = `<p style="margin:0;">${escapeHtml(body)}</p>`
  const appUrl = getAppUrl()

  return {
    subject,
    html: buildEmailLayout({
      preheader: heading,
      heading,
      bodyHtml,
      ctaLabel: "Open CardShare.ai",
      ctaUrl: appUrl,
      footerNote,
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Open CardShare.ai",
      ctaUrl: appUrl,
      footerNote,
    }),
  }
}

export function buildPasswordResetEmail({
  link,
}: AuthEmailInput): EmailContent {
  const heading = "Reset your password"
  const body =
    "We received a request to reset your CardShare.ai password. This link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email."
  const bodyHtml = `<p style="margin:0 0 12px 0;">We received a request to reset your CardShare.ai password. This link expires in 1 hour.</p><p style="margin:0;">If you didn&apos;t request this, you can safely ignore this email.</p>`

  return {
    subject: "Reset your CardShare.ai password",
    html: buildEmailLayout({
      preheader: "Reset your CardShare.ai password",
      heading,
      bodyHtml,
      ctaLabel: "Reset password",
      ctaUrl: link,
      footerNote:
        "You received this because a password reset was requested for your CardShare.ai account.",
    }),
    text: buildPlainTextEmail({
      heading,
      body,
      ctaLabel: "Reset password",
      ctaUrl: link,
      footerNote:
        "You received this because a password reset was requested for your CardShare.ai account.",
    }),
  }
}

/** @deprecated Use buildRecipientCardEmail().html */
export function buildRecipientCardHtml(input: CardEmailInput): string {
  return buildRecipientCardEmail(input).html
}

/** @deprecated Use buildContributorInviteEmail().html */
export function buildContributorInviteHtml(input: CardEmailInput): string {
  return buildContributorInviteEmail(input).html
}
