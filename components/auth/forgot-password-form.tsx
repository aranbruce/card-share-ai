"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AuthPageHeader } from "@/components/auth/page-header"
import { AuthSuccessPanel } from "@/components/auth/success-panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field-error"
import Link from "next/link"
import { friendlyAuthError } from "@/lib/auth-errors"
import { emailError } from "@/lib/form-validation"
import { useFieldErrors } from "@/hooks/use-field-errors"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const fields = useFieldErrors(
    { email: emailError(email) },
    { email: "email" },
  )

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!fields.validate()) return
    setLoading(true)
    setSuccess(false)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/recovery-callback`,
        },
      )

      if (resetError) {
        setError(friendlyAuthError(resetError.message, resetError.status))
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthSuccessPanel
        title="Check Your Email"
        description={
          <>
            We&apos;ve sent you a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </>
        }
        footer="Click the link in the email to reset your password. The link will expire in 1 hour."
        action={{ href: "/login", label: "Back to Login" }}
      />
    )
  }

  return (
    <>
      <AuthPageHeader
        align="center"
        title="Reset Password"
        description="Enter your email address and we'll send you a link to reset your password"
      />

      <form onSubmit={handleResetRequest} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <Input
            {...fields.fieldProps("email")}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError("")
            }}
            placeholder="you@example.com"
            disabled={loading}
            variant="auth"
          />
          <FieldError id={fields.errorId("email")}>
            {fields.error("email")}
          </FieldError>
        </div>

        {error ? (
          <Alert variant="destructive" className="my-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          className="mt-4"
          disabled={loading}
        >
          {loading ? "Sending reset link..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  )
}
