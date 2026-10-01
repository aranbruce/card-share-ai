import type { Metadata } from "next"
import Link from "next/link"
import { AuthSuccessPanel } from "@/components/auth/success-panel"
import { privatePageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = privatePageMetadata("Check your email")

export default function SignUpSuccessPage() {
  return (
    <AuthSuccessPanel
      title="Check Your Email"
      description={
        <>
          We&apos;ve sent you a confirmation link. Please verify your email to
          complete your account setup.
        </>
      }
      hint={
        <>
          Didn&apos;t receive the email? Check your spam folder or try signing
          up again. If you&apos;ve already confirmed your email,{" "}
          <Link
            href="/login"
            className="font-medium text-brand hover:underline"
          >
            sign in
          </Link>{" "}
          instead.
        </>
      }
      action={{ href: "/", label: "Return Home" }}
    />
  )
}
