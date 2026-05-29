import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
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
}

const HANDLED_AUTH_EMAIL_TYPES = new Set(["signup", "recovery"])

export function buildSupabaseAuthLink(emailData: SupabaseEmailData): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }

  const baseUrl = `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify`
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  })

  return `${baseUrl}?${params.toString()}`
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
}): Promise<SendEmailResult | { ok: true; skipped: true }> {
  if (!isHandledAuthEmailType(emailData.email_action_type)) {
    return { ok: true, skipped: true }
  }

  const link = buildSupabaseAuthLink(emailData)
  const content =
    emailData.email_action_type === "recovery"
      ? buildPasswordResetEmail({ link })
      : buildEmailVerificationEmail({ link })

  return sendEmailViaResend({
    to: user.email,
    ...content,
  })
}
