import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal-page"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Sub-processors",
  description:
    "The third-party service providers CardShare.ai uses to process data, what they do, and where they are located.",
  path: "/subprocessors",
  robots: { index: true, follow: true },
})

const CONTACT_EMAIL = "hello@cardshare.ai"

const SUBPROCESSORS = [
  {
    name: "Vercel",
    purpose:
      "Application hosting, serverless functions, and the AI Gateway that routes AI text generation requests",
    location: "United States",
  },
  {
    name: "Supabase",
    purpose:
      "Database, authentication, and file storage for accounts, cards, contributions, and Slack installation data",
    location: "United States",
  },
  {
    name: "OpenAI",
    purpose:
      "Generates card headlines and messages from the details you provide",
    location: "United States",
  },
  {
    name: "Google (Gemini)",
    purpose: "Generates card cover images from the details you provide",
    location: "United States",
  },
  {
    name: "Resend",
    purpose: "Sends account and card emails",
    location: "United States",
  },
  {
    name: "PostHog",
    purpose: "Product analytics and AI request monitoring",
    location: "European Union",
  },
  {
    name: "Giphy",
    purpose: "GIF search for card contributions",
    location: "United States",
  },
]

export default function SubprocessorsPage() {
  return (
    <LegalPage title="Sub-processors">
      <p>
        <strong>Last updated:</strong> 1 October 2026
      </p>
      <p>
        CardShare.ai uses the third-party service providers below
        (&quot;sub-processors&quot;) to run cardshare.ai and our Slack app. Each
        one only processes data on our instructions and only as needed to
        provide its part of the service. See our{" "}
        <Link
          href="/privacy"
          className="text-foreground underline underline-offset-4"
        >
          privacy policy
        </Link>{" "}
        for what data we collect and why.
      </p>

      <h2>Current sub-processors</h2>
      <ul>
        {SUBPROCESSORS.map((sp) => (
          <li key={sp.name}>
            <strong>{sp.name}</strong>: {sp.purpose}. Location: {sp.location}.
          </li>
        ))}
      </ul>

      <h2>AI assistants you connect</h2>
      <p>
        If you connect CardShare.ai to an AI assistant such as Claude
        (Anthropic) or ChatGPT (OpenAI), that company is not our sub-processor.
        You choose to share data with it, and it handles that data under its own
        terms and privacy policy.
      </p>

      <h2>How we choose sub-processors</h2>
      <p>
        We only use providers that protect data with encryption in transit and
        appropriate access controls, and that commit to handling data under
        their published data processing terms. We share the minimum data each
        provider needs to do its job.
      </p>

      <h2>Changes to this list</h2>
      <p>
        When we add or replace a sub-processor, we update this page and the date
        at the top. If you have questions or want to object to a change, email{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-foreground underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  )
}
