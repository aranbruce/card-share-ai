import { NextRequest, NextResponse } from "next/server"
import { sendEmailViaResend } from "@/lib/email/resend"
import { checkFixedWindowRateLimit } from "@/lib/request-rate-limit"
import { captureServerEvent } from "@/lib/posthog-server"
import { getDistinctIdFromRequest } from "@/lib/posthog-distinct-id-from-request"
import {
  buildTeamsEnquiryEmail,
  TEAMS_ENQUIRY_INBOX,
  teamsEnquirySchema,
} from "@/lib/teams-enquiry"

export async function POST(request: NextRequest) {
  const rateLimit = checkFixedWindowRateLimit(request, {
    namespace: "api:teams-enquiry",
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
  })
  const headers = rateLimit.headers

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers },
    )
  }

  const parsed = teamsEnquirySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
      { status: 400, headers },
    )
  }

  const enquiry = parsed.data
  const result = await sendEmailViaResend({
    to: TEAMS_ENQUIRY_INBOX,
    replyTo: enquiry.email,
    ...buildTeamsEnquiryEmail(enquiry),
  })

  if (!result.ok) {
    console.error("[POST /api/teams-enquiry]:", result.error)
    return NextResponse.json(
      { error: "We couldn't send your request. Please try again." },
      { status: 500, headers },
    )
  }

  const distinctId = getDistinctIdFromRequest(request)
  if (distinctId) {
    captureServerEvent(distinctId, "teams_enquiry_submitted", {
      team_size: enquiry.size,
      interests: enquiry.interests,
    })
  }

  return NextResponse.json({ ok: true }, { headers })
}
