import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong with your authentication. Please try again.
        </p>

        <div className="space-y-3">
          <Link href="/auth/login" className="block">
            <Button variant="outline" className="w-full">
              Back to Login
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button className="w-full">Return Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
