import type { Metadata } from "next"
import { OAuthConsentForm } from "@/components/auth/oauth-consent-form"
import { privatePageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = privatePageMetadata("Connect an app")

export default function OAuthConsentPage() {
  return <OAuthConsentForm />
}
