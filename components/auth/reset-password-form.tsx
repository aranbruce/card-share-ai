"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AuthPageHeader } from "@/components/auth/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field-error"
import { confirmPasswordError, newPasswordError } from "@/lib/form-validation"
import { useFieldErrors } from "@/hooks/use-field-errors"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const fields = useFieldErrors(
    {
      password: newPasswordError(password),
      confirmPassword: confirmPasswordError(password, confirmPassword),
    },
    { password: "password", confirmPassword: "confirmPassword" },
  )

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!fields.validate()) return
    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      router.push("/reset-password-success")
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <>
      <AuthPageHeader
        align="center"
        title="Set New Password"
        description="Choose a new password for your account"
      />

      <form onSubmit={handleResetPassword} noValidate className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            New Password
          </label>
          <Input
            {...fields.fieldProps("password")}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError("")
            }}
            placeholder="••••••••"
            disabled={loading}
            variant="auth"
          />
          <FieldError id={fields.errorId("password")}>
            {fields.error("password")}
          </FieldError>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium"
          >
            Confirm Password
          </label>
          <Input
            {...fields.fieldProps("confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setError("")
            }}
            placeholder="••••••••"
            disabled={loading}
            variant="auth"
          />
          <FieldError id={fields.errorId("confirmPassword")}>
            {fields.error("confirmPassword")}
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
          {loading ? "Resetting password..." : "Reset Password"}
        </Button>
      </form>
    </>
  )
}
