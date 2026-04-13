import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-foreground transition-opacity hover:opacity-80", className)}>
      <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
        <Sparkles className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold tracking-tight">CardsAI</span>
    </Link>
  )
}
