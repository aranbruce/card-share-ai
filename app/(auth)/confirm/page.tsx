import type { Metadata } from "next"
import { AuthMessagePanel } from "@/components/auth/message-panel"
import { AuthPageHeader } from "@/components/auth/page-header"
import { Button } from "@/components/ui/button"
import { privatePageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = privatePageMetadata("Confirm")

const COPY = {
  email: {
    action: "/callback",
    title: "Confirm your email",
    description: "Click below to confirm your email and sign in.",
    button: "Confirm email",
  },
  recovery: {
    action: "/recovery-callback",
    title: "Reset your password",
    description: "Click below to continue and choose a new password.",
    button: "Continue",
  },
} as const

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Auth emails link here instead of verifying straight away. Email security
 * scanners that open links in advance only load this page; the single-use
 * token is redeemed when the user clicks, via a POST to the callback route.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const tokenHash = firstParam(params.token_hash)
  const type = firstParam(params.type)
  const next = firstParam(params.next)

  if (!tokenHash || (type !== "email" && type !== "recovery")) {
    return (
      <AuthMessagePanel
        title="Link not valid"
        description="This link is incomplete. Open the latest email we sent you, or request a new one."
        actions={[
          { href: "/login", label: "Back to sign in", variant: "outline" },
          { href: "/forgot-password", label: "Reset password" },
        ]}
      />
    )
  }

  const copy = COPY[type]

  return (
    <>
      <AuthPageHeader
        align="center"
        title={copy.title}
        description={copy.description}
      />
      <form method="post" action={copy.action}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Button type="submit" size="lg" fullWidth>
          {copy.button}
        </Button>
      </form>
    </>
  )
}
