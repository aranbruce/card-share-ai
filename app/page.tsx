'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setSignedIn(!!user)
      setLoading(false)
    }

    checkUser()
  }, [supabase])

  if (loading) {
    return null
  }

  if (signedIn) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/40 bg-background/60 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
            <Logo />
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
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-32 text-center">
          <h2 className="text-5xl font-extrabold mb-6 tracking-tight">Welcome Back!</h2>
          <p className="text-xl text-muted-foreground mb-12">
            Ready to create another amazing card?
          </p>
          <Link href="/create">
            <Button size="lg" className="h-12 px-8 rounded-full text-base">Create New Card</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <Logo />
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
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-24 md:py-32 text-center">
        <div className="inline-block px-4 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium mb-8 border border-border/50 shadow-sm">
          No Sign Up Required to Start
        </div>
        <h2 className="text-5xl md:text-7xl font-extrabold mb-6 text-balance tracking-tight">
          Create Beautiful Greeting Cards with AI
        </h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance leading-relaxed">
          Generate personalized greeting cards with AI-powered text and images. Invite friends and
          family to add messages before sending to the recipient.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/create">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full text-base">
              Create a Card — Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full text-base border-border/50 hover:bg-secondary/50">
              I Have an Account
            </Button>
          </Link>
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-4 gap-8 py-12 text-left relative">
          <div className="p-2 relative z-10">
            <div className="text-sm font-bold text-muted-foreground mb-3 tracking-wider uppercase">STEP 01</div>
            <h3 className="font-semibold text-lg mb-2">Choose a Card Type</h3>
            <p className="text-muted-foreground leading-relaxed">
              Birthday, thank you, congratulations, or custom
            </p>
          </div>
          <div className="p-2 relative z-10">
            <div className="text-sm font-bold text-muted-foreground mb-3 tracking-wider uppercase">STEP 02</div>
            <h3 className="font-semibold text-lg mb-2">AI Generates Your Card</h3>
            <p className="text-muted-foreground leading-relaxed">
              Unique image and personalized message created instantly
            </p>
          </div>
          <div className="p-2 relative z-10">
            <div className="text-sm font-bold text-muted-foreground mb-3 tracking-wider uppercase">STEP 03</div>
            <h3 className="font-semibold text-lg mb-2">Customize and Edit</h3>
            <p className="text-muted-foreground leading-relaxed">
              Fine-tune the message or regenerate until it&apos;s perfect
            </p>
          </div>
          <div className="p-2 relative z-10">
            <div className="text-sm font-bold text-muted-foreground mb-3 tracking-wider uppercase">STEP 04</div>
            <h3 className="font-semibold text-lg mb-2">Share and Send</h3>
            <p className="text-muted-foreground leading-relaxed">
              Invite others to add messages, then send to the recipient
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 py-20">
          <div className="p-8 rounded-2xl border border-transparent hover:border-border/50 hover:bg-secondary/30 hover:shadow-sm hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">AI-Generated Images</h3>
            <p className="text-muted-foreground leading-relaxed">
              Beautiful, unique card images generated by AI for every occasion
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-transparent hover:border-border/50 hover:bg-secondary/30 hover:shadow-sm hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Personalized Copy</h3>
            <p className="text-muted-foreground leading-relaxed">
              Smart AI generates heartfelt, customized messages for any card type
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-transparent hover:border-border/50 hover:bg-secondary/30 hover:shadow-sm hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Group Contributions</h3>
            <p className="text-muted-foreground leading-relaxed">
              Share cards with friends and family to add their own messages
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-24 text-center">
          <h3 className="text-4xl font-bold mb-6 tracking-tight">Ready to Create Your First Card?</h3>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Start creating now — no account needed until you&apos;re ready to save
          </p>
          <Link href="/create">
            <Button size="lg" className="h-12 px-8 rounded-full text-base shadow-sm">Start Creating Now</Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-foreground opacity-80">
            <div className="bg-primary text-primary-foreground p-1 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
            </div>
            <p className="text-sm font-bold tracking-wide">CardsAI</p>
          </div>
          <p className="text-sm text-muted-foreground">Create beautiful greeting cards with AI</p>
        </div>
      </footer>
    </div>
  )
}
