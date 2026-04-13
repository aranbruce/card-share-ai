import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function SignUpSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h1 className="mb-2 text-2xl font-bold">Check Your Email</h1>
        <p className="mb-6 text-muted-foreground">
          We&apos;ve sent you a confirmation link. Please verify your email to
          complete your account setup.
        </p>

        <div className="mb-6 rounded border border-secondary bg-secondary/50 p-4 text-sm">
          <p>
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button className="font-medium text-primary hover:underline">
              try again
            </button>
            .
          </p>
        </div>

        <Link href="/" className="inline-block">
          <Button variant="outline">Return Home</Button>
        </Link>
      </Card>
    </div>
  )
}
