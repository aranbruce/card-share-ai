import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"
import { buildPageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of use",
  description:
    "Terms for using CardShare.ai to create, share, and sign group greeting cards.",
  path: "/terms",
  robots: { index: true, follow: true },
})

const CONTACT_EMAIL = "cardshareai@gmail.com"

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        <strong>Last updated:</strong> 1 October 2026
      </p>
      <p>
        These terms are a contract between you and CardShare.ai (&quot;we&quot;,
        &quot;us&quot;). By using cardshare.ai, our apps, or integrations (such
        as Slack), you agree to them. If you do not agree, do not use the
        service.
      </p>

      <h2>The service</h2>
      <p>
        CardShare.ai helps you create digital greeting cards, invite others to
        add messages and GIFs through a single link, and share the finished card
        with a recipient. Features, pricing, and availability may change. We try
        to keep the service running smoothly but do not promise uninterrupted or
        error-free operation.
      </p>

      <h2>Accounts</h2>
      <p>
        Creating and managing cards requires an account. You are responsible for
        your login credentials and for activity under your account. Contributors
        may sign a card without an account; the card owner is still responsible
        for how that link is shared.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of content you submit. You give us a license to host,
        display, reproduce, and process that content (including through AI) so
        we can operate the service, show cards to people with your links, and
        improve our tools. You confirm you have the right to use any names,
        photos, GIFs, and messages you add, and that your content does not
        violate these terms or anyone else&apos;s rights.
      </p>

      <h2>Sharing links</h2>
      <p>
        View and contribute links are designed to be shared with people you
        trust. Anyone with a link may be able to read the card or add a
        contribution, depending on the page. Links are not listed publicly, but
        they are not password-protected unless you treat them that way. Share
        them carefully.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Post unlawful, harassing, hateful, defamatory, or infringing content
        </li>
        <li>Impersonate others or mislead recipients about who sent a card</li>
        <li>Probe or disrupt our systems, bypass limits, or scrape at scale</li>
        <li>
          Use the service for spam, phishing, or unsolicited bulk messaging
        </li>
        <li>
          Upload malware or content that harms others&apos; devices or data
        </li>
      </ul>
      <p>
        We may remove content or suspend access if we reasonably believe you
        have broken these rules or put the service or others at risk.
      </p>

      <h2>AI-generated content</h2>
      <p>
        Headlines, messages, and images may be produced or suggested by AI. They
        can be wrong, off-tone, or inappropriate. You are responsible for
        reviewing everything before you share or send a card. Do not rely on AI
        output as professional, legal, or medical advice.
      </p>

      <h2>Third-party services</h2>
      <p>
        The service links to or integrates with third parties (for example Giphy
        for GIFs, OAuth providers for sign-in, or Slack). Their terms and
        privacy policies apply when you use those features.
      </p>

      <h2>Free and paid use</h2>
      <p>
        We may offer free and paid features. If fees apply in future, we will
        describe them before you are charged. Unless required by law, fees are
        non-refundable once a billing period has started.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided &quot;as is&quot; and &quot;as available&quot;
        to the fullest extent permitted by law. We disclaim warranties of
        merchantability, fitness for a particular purpose, and non-infringement
        where allowed.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect,
        incidental, special, consequential, or punitive damages, or for lost
        profits or data. Our total liability for any claim relating to the
        service is limited to the greater of (a) amounts you paid us in the
        twelve months before the claim, or (b) zero if you used the service for
        free.
      </p>

      <h2>Indemnity</h2>
      <p>
        You will defend and hold us harmless from claims arising out of your
        content, your use of the service, or your breach of these terms, except
        where caused by our intentional misconduct.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the service at any time. We may suspend or end access
        if you violate these terms or if we discontinue the product. Sections
        that should survive (such as content licences, disclaimers, and
        liability limits) will continue to apply.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. We will post the new date on this page.
        Material changes may also be highlighted in the product or by email
        where appropriate. Continued use after the effective date means you
        accept the updated terms.
      </p>

      <h2>General</h2>
      <p>
        These terms are the entire agreement between you and us about the
        service. If one part is unenforceable, the rest remains in effect. We
        may assign our rights; you may not assign yours without our consent.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
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
