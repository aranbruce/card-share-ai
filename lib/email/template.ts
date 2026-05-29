import { getAppUrl } from "@/lib/app-url"
import { assertSafeHttpUrl, escapeHtml } from "@/lib/email/utils"

export const EMAIL_BRAND = {
  background: "#fafaf7",
  foreground: "#111110",
  muted: "#7a7a78",
  border: "#e8e6e0",
  card: "#ffffff",
  brand: "#ff5a4a",
  brandDark: "#e54a3c",
} as const

export type EmailLayoutInput = {
  preheader: string
  heading: string
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
  footerNote: string
}

export type PlainTextEmailInput = {
  heading: string
  body: string
  ctaLabel: string
  ctaUrl: string
  footerNote: string
}

export function buildPlainTextEmail({
  heading,
  body,
  ctaLabel,
  ctaUrl,
  footerNote,
}: PlainTextEmailInput): string {
  return `${heading}\n\n${body}\n\n${ctaLabel}: ${ctaUrl}\n\n${footerNote}\n\n— CardShareAI`
}

export function buildEmailLayout({
  preheader,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailLayoutInput): string {
  const safeLink = escapeHtml(assertSafeHttpUrl(ctaUrl))
  const safeHeading = escapeHtml(heading)
  const safeCtaLabel = escapeHtml(ctaLabel)
  const safeFooter = escapeHtml(footerNote)
  const safePreheader = escapeHtml(preheader)
  const logoUrl = escapeHtml(`${getAppUrl()}/apple-icon.png`)

  const { background, foreground, muted, border, card, brand, brandDark } =
    EMAIL_BRAND

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${safeHeading}</title>
</head>
<body style="margin:0;padding:0;background-color:${background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding:0 0 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${logoUrl}" alt="" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;font-size:18px;font-weight:700;color:${foreground};letter-spacing:-0.02em;">
                    CardShareAI
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${card};border:1px solid ${border};border-radius:12px;padding:32px 28px;">
              <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;font-weight:700;color:${foreground};letter-spacing:-0.02em;">
                ${safeHeading}
              </h1>
              <div style="font-size:16px;line-height:1.6;color:${muted};">
                ${bodyHtml}
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 20px 0;">
                <tr>
                  <td style="border-radius:8px;background-color:${brand};">
                    <a href="${safeLink}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${brand};">
                      ${safeCtaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.5;color:${muted};">
                Or copy and paste this link into your browser:<br />
                <a href="${safeLink}" style="color:${brandDark};word-break:break-all;">${safeLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0 8px;font-size:13px;line-height:1.5;color:${muted};text-align:center;">
              ${safeFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
