import { Webhook } from "standardwebhooks"
import { NextRequest, NextResponse } from "next/server"
import {
  sendAuthEmail,
  type SupabaseAuthEmailUser,
  type SupabaseEmailData,
} from "@/lib/email/auth"
import {
  getSendEmailHookSecretFromEnv,
  getStandardWebhookHeaders,
} from "@/lib/email/send-email-hook"

export async function POST(request: NextRequest) {
  const hookSecret = getSendEmailHookSecretFromEnv()
  if (!hookSecret) {
    console.error(
      "[POST /api/auth/send-email] Missing SEND_EMAIL_HOOK_SECRET env var",
    )
    return NextResponse.json(
      { error: { message: "Email hook is not configured" } },
      { status: 500 },
    )
  }

  const payload = await request.text()
  const headers = getStandardWebhookHeaders(request)

  let user: SupabaseAuthEmailUser
  let email_data: SupabaseEmailData

  try {
    const wh = new Webhook(hookSecret)
    const verified = wh.verify(payload, headers) as {
      user: SupabaseAuthEmailUser
      email_data: SupabaseEmailData
    }
    user = verified.user
    email_data = verified.email_data
  } catch (error) {
    console.error(
      "[POST /api/auth/send-email] Webhook verification failed:",
      error,
    )
    return NextResponse.json(
      { error: { message: "Invalid webhook signature" } },
      { status: 401 },
    )
  }

  try {
    const result = await sendAuthEmail({ user, emailData: email_data })

    if (!result.ok) {
      return NextResponse.json(
        { error: { message: result.error } },
        { status: 500 },
      )
    }

    return NextResponse.json({})
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email"
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
