'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [supabase])

  if (loading) {
    return null
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
        {/* Header */}
        <header className="border-b bg-background/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">CardAI</h1>
            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Ready to create another amazing card?
          </p>
          <Link href="/create">
            <Button size="lg">Create New Card</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CardAI</h1>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
        <div className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
          No Sign Up Required to Start
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
          Create Beautiful Greeting Cards with AI
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
          Generate personalized greeting cards with AI-powered text and images. Invite friends and
          family to add messages before sending to the recipient.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/create">
            <Button size="lg" className="w-full sm:w-auto">
              Create a Card — Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              I Have an Account
            </Button>
          </Link>
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-4 gap-6 py-8 text-left">
          <div className="p-6 bg-background/50 rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-2">1</div>
            <h3 className="font-semibold mb-1">Choose a Card Type</h3>
            <p className="text-sm text-muted-foreground">
              Birthday, thank you, congratulations, or custom
            </p>
          </div>
          <div className="p-6 bg-background/50 rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-2">2</div>
            <h3 className="font-semibold mb-1">AI Generates Your Card</h3>
            <p className="text-sm text-muted-foreground">
              Unique image and personalized message created instantly
            </p>
          </div>
          <div className="p-6 bg-background/50 rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-2">3</div>
            <h3 className="font-semibold mb-1">Customize and Edit</h3>
            <p className="text-sm text-muted-foreground">
              Fine-tune the message or regenerate until it&apos;s perfect
            </p>
          </div>
          <div className="p-6 bg-background/50 rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-2">4</div>
            <h3 className="font-semibold mb-1">Share and Send</h3>
            <p className="text-sm text-muted-foreground">
              Invite others to add messages, then send to the recipient
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 py-16">
          <Card className="p-8">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">AI-Generated Images</h3>
            <p className="text-muted-foreground">
              Beautiful, unique card images generated by AI for every occasion
            </p>
          </Card>

          <Card className="p-8">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Personalized Copy</h3>
            <p className="text-muted-foreground">
              Smart AI generates heartfelt, customized messages for any card type
            </p>
          </Card>

          <Card className="p-8">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Group Contributions</h3>
            <p className="text-muted-foreground">
              Share cards with friends and family to add their own messages
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-background/50 border-t">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Create Your First Card?</h3>
          <p className="text-lg text-muted-foreground mb-8">
            Start creating now — no account needed until you&apos;re ready to save
          </p>
          <Link href="/create">
            <Button size="lg">Start Creating Now</Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>CardAI - Create beautiful greeting cards with AI</p>
        </div>
      </footer>
    </div>
  )
}
