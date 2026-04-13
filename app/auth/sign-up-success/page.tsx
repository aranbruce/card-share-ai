import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function SignUpSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent you a confirmation link. Please verify your email to complete your account setup.
        </p>

        <div className="bg-secondary/50 border border-secondary rounded p-4 mb-6 text-sm">
          <p>
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button className="text-primary hover:underline font-medium">
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
