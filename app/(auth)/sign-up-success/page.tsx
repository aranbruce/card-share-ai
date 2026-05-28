import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function SignUpSuccess() {
  return (
    <>
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h1 className="mb-2 text-2xl font-bold">Check Your Email</h1>
        <p className="mb-6 text-muted-foreground">
          We&apos;ve sent you a confirmation link. Please verify your email to
          complete your account setup.
        </p>

        <Alert className="mb-6 text-left">
          <AlertDescription>
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <Button variant="link" className="h-auto p-0 text-sm font-medium">
              try again
            </Button>
            .
          </AlertDescription>
        </Alert>

        <Button asChild variant="outline">
          <Link href="/">Return Home</Link>
        </Button>
      </Card>
    </>
  )
}
