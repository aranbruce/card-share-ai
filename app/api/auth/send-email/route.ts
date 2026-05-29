import { Webhook } from "standardwebhooks"
import { NextRequest, NextResponse } from "next/server"
import {
  sendAuthEmail,
  type SupabaseAuthEmailUser,
  type SupabaseEmailData,
} from "@/lib/email/auth"

function getHookSecret(): string {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET
  if (!secret) {
    throw new Error("Missing SEND_EMAIL_HOOK_SECRET")
  }
  return secret.replace(/^v1,whsec_/, "")
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const headers = Object.fromEntries(request.headers)

  let user: SupabaseAuthEmailUser
  let email_data: SupabaseEmailData

  try {
    const wh = new Webhook(getHookSecret())
    const verified = wh.verify(payload, headers) as {
      user: SupabaseAuthEmailUser
      email_data: SupabaseEmailData
    }
    user = verified.user
    email_data = verified.email_data
  } catch {
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
