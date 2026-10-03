import { z } from "zod"
import type { EmailContent } from "@/lib/email/messages"
import { escapeHtml, sanitizeEmailHeaderValue } from "@/lib/email/utils"

/** Where Teams plan quote requests are emailed. */
export const TEAMS_ENQUIRY_INBOX = "cardshareai@gmail.com"

export const TEAM_SIZES = [
  "1–10",
  "11–50",
  "51–200",
  "201–1,000",
  "1,000+",
] as const

export const TEAM_INTERESTS = [
  "Team calendar",
  "Reminders",
  "One-link signing",
  "Admin dashboard",
  "Scheduled sending",
] as const

export const teamsEnquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email")
    .max(254)
    .pipe(z.email("Enter an email like name@company.com")),
  company: z.string().trim().min(1, "Enter your company name").max(160),
  size: z.enum(TEAM_SIZES, { error: "Choose a team size" }),
  interests: z.array(z.enum(TEAM_INTERESTS)).max(TEAM_INTERESTS.length),
})

export type TeamsEnquiry = z.infer<typeof teamsEnquirySchema>
export type TeamsEnquiryField = "name" | "email" | "company" | "size"

export const TEAMS_ENQUIRY_FIELD_LABELS: Record<TeamsEnquiryField, string> = {
  name: "Name",
  email: "Work email",
  company: "Company",
  size: "Team size",
}

/** First error per required field, in form order, for inline messages. */
export function getTeamsEnquiryErrors(
  input: unknown,
): Partial<Record<TeamsEnquiryField, string>> {
  const result = teamsEnquirySchema.safeParse(input)
  if (result.success) return {}

  const errors: Partial<Record<TeamsEnquiryField, string>> = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (typeof field === "string" && field in TEAMS_ENQUIRY_FIELD_LABELS) {
      errors[field as TeamsEnquiryField] ??= issue.message
    }
  }
  return errors
}

/** The internal notification email for a quote request. */
export function buildTeamsEnquiryEmail(enquiry: TeamsEnquiry): EmailContent {
  const interests = enquiry.interests.length
    ? enquiry.interests.join(", ")
    : "None selected"
  const rows: [string, string][] = [
    ["Name", enquiry.name],
    ["Work email", enquiry.email],
    ["Company", enquiry.company],
    ["Team size", enquiry.size],
    ["Interested in", interests],
  ]

  const html = `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#5f5d5b;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#111110;">${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table>`

  return {
    subject: `Teams quote request: ${sanitizeEmailHeaderValue(enquiry.company)} (${enquiry.size})`,
    html,
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
  }
}
