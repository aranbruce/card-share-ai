import { z } from "zod"
import { getAppUrl } from "@/lib/app-url"
import type { EmailContent } from "@/lib/email/messages"
import { buildEmailLayout, buildPlainTextEmail } from "@/lib/email/template"
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

/** Also set as `maxLength` on the form inputs. */
export const TEAMS_ENQUIRY_MAX_LENGTHS = {
  name: 120,
  email: 254,
  company: 160,
} as const

export const teamsEnquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(
      TEAMS_ENQUIRY_MAX_LENGTHS.name,
      `Keep your name to ${TEAMS_ENQUIRY_MAX_LENGTHS.name} characters or fewer`,
    ),
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email")
    .max(
      TEAMS_ENQUIRY_MAX_LENGTHS.email,
      `Keep your email to ${TEAMS_ENQUIRY_MAX_LENGTHS.email} characters or fewer`,
    )
    .pipe(z.email("Enter an email like name@company.com")),
  company: z
    .string()
    .trim()
    .min(1, "Enter your company name")
    .max(
      TEAMS_ENQUIRY_MAX_LENGTHS.company,
      `Keep the company name to ${TEAMS_ENQUIRY_MAX_LENGTHS.company} characters or fewer`,
    ),
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

const CONFIRMATION_HEADING =
  "Thanks for your interest in CardShare.ai for Teams"
const CONFIRMATION_BODY =
  "We've received your quote request and will email you a quote for your team shortly. Reply to this email if there's anything else you'd like us to know."
const CONFIRMATION_FOOTER =
  "You received this because this email address was used to request a CardShare.ai for Teams quote. If that wasn't you, you can ignore this email."

/**
 * The confirmation sent to the enquirer. Fixed text only: the form needs no
 * sign-in, so nothing the submitter typed is echoed to the address they gave.
 */
export function buildTeamsEnquiryConfirmationEmail(): EmailContent {
  const ctaUrl = `${getAppUrl()}/create`
  const ctaLabel = "Start a free card"
  return {
    subject: "We've received your CardShare.ai for Teams quote request",
    html: buildEmailLayout({
      preheader: "We'll email you a quote for your team shortly",
      heading: CONFIRMATION_HEADING,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hi there,</p><p style="margin:0;">${escapeHtml(CONFIRMATION_BODY)}</p>`,
      ctaLabel,
      ctaUrl,
      footerNote: CONFIRMATION_FOOTER,
    }),
    text: buildPlainTextEmail({
      heading: CONFIRMATION_HEADING,
      body: `Hi there,\n\n${CONFIRMATION_BODY}`,
      ctaLabel,
      ctaUrl,
      footerNote: CONFIRMATION_FOOTER,
    }),
  }
}
