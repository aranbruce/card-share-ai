import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function AuthError() {
  return (
    <>
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">Authentication Error</h1>
        <p className="mb-6 text-muted-foreground">
          Something went wrong with your authentication. Please try again.
        </p>

        <div className="space-y-3">
          <Link href="/auth/login" className="block">
            <Button fullWidth variant="outline">
              Back to Login
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button fullWidth>Return Home</Button>
          </Link>
        </div>
      </Card>
    </>
  )
}
