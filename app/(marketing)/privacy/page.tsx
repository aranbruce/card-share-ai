import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy policy",
  description:
    "How CardShare.ai collects, uses, and protects your data when you create and share greeting cards.",
  path: "/privacy",
  robots: { index: true, follow: true },
})

const CONTACT_EMAIL = "hello@cardshare.ai"

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        <strong>Last updated:</strong> 4 June 2026
      </p>
      <p>
        CardShare.ai (&quot;we&quot;, &quot;us&quot;) runs cardshare.ai and
        related services that let you create group greeting cards, collect
        messages from others, and share finished cards. This policy explains
        what information we collect, why we use it, and the choices you have.
      </p>

      <h2>Who this applies to</h2>
      <p>
        It covers people who create an account, build or manage cards, and
        anyone who opens a contribute or view link. Contributors can add a note
        without signing up; we still process the content they submit and basic
        technical data needed to run the service.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong>: Such as your email address and
          sign-in details when you register or use Google or GitHub login.
        </li>
        <li>
          <strong>Card content</strong>: Recipient and sender names, headlines,
          messages, uploaded photos, GIFs, layout choices, and contributions
          from people who sign your card.
        </li>
        <li>
          <strong>Link and session data</strong>: Contributor links are unlisted
          but not secret; anyone with the link can view or sign the card
          depending on the page. We may store edit tokens in your browser so you
          can update your own contribution from the same device.
        </li>
        <li>
          <strong>Usage and diagnostics</strong>: Pages visited, feature use,
          and similar product analytics (for example via PostHog) to understand
          what works and fix problems.
        </li>
        <li>
          <strong>AI processing</strong>: Prompts and context you provide for
          headlines, messages, or cover art, plus the outputs our AI partners
          return. Do not include sensitive personal data you do not want
          processed for generation.
        </li>
        <li>
          <strong>Slack integration</strong>: If you install our Slack app, we
          receive workspace and user identifiers needed to run slash commands
          and deliver card links in Slack.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>We use data to:</p>
      <ul>
        <li>Host cards, authenticate users, and deliver email you request</li>
        <li>Generate and refine AI copy and images at your direction</li>
        <li>Display cards to people you share links with</li>
        <li>Improve reliability, security, and the product experience</li>
        <li>Comply with law and respond to valid requests</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>How we share information</h2>
      <p>
        We use trusted service providers for hosting, databases, authentication,
        email, analytics, AI, and (if you use it) Slack. They process data on
        our instructions to operate CardShare.ai. When you share a card link,
        you control who receives it. We do not publish cards in a public
        directory.
      </p>

      <h2>Retention</h2>
      <p>
        Card data is kept while your card exists in our systems. You can delete
        cards from your dashboard. If you want your account removed, email us.
        We may keep limited logs and backups for security, fraud prevention, and
        legal obligations, then delete them when no longer needed.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Review and edit card content before sending or sharing links</li>
        <li>Delete cards you manage from the dashboard</li>
        <li>
          Ask us for access, correction, or deletion of account-related data at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-foreground underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </li>
        <li>
          Use browser controls or opt-out tools where available for analytics
          cookies
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        We use industry-standard measures such as encrypted connections and
        access controls. No online service is perfectly secure; please use a
        strong password and treat share links like private invitations.
      </p>

      <h2>Children</h2>
      <p>
        CardShare.ai is not directed at children under 13, and we do not
        knowingly collect their personal information. Contact us if you believe
        we have done so and we will take appropriate steps.
      </p>

      <h2>International users</h2>
      <p>
        We may process and store information in countries where we or our
        providers operate. By using the service, you understand your data may be
        transferred to those locations, with safeguards where required by law.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. We will post the new date
        at the top of this page. Continued use after changes means you accept
        the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests:{" "}
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
