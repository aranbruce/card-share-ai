import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-360 items-center justify-between px-6 md:px-15">
        <div className="flex items-center gap-[34px]">
          <Logo />
          <nav
            className="hidden items-center gap-[26px] md:flex"
            aria-label="Primary"
          >
            <Link
              href="/browse"
              className="text-[14.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse
            </Link>
            <Link
              href="/templates"
              className="text-[14.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Photo templates
            </Link>
            <Link
              href="/slack/install"
              className="text-[14.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Add to Slack
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-[14px]">
          <Link
            href="/login"
            className="hidden text-[14.5px] text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/create">
              Start a card
              <span className="inline-flex">
                <ArrowRight aria-hidden />
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
