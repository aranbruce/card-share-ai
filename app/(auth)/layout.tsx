import { Logo } from "@/components/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — dark brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-14 lg:flex">
        {/* Logo */}
        <Logo variant="dark" className="self-start" />

        {/* Floating card previews */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 right-1/10 w-[260px] rotate-6 overflow-hidden rounded-2xl shadow-2xl"
            style={{ aspectRatio: "3/4" }}
          >
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.85 0.12 45) 0%, oklch(0.65 0.18 15) 100%)",
              }}
            />
          </div>
          <div
            className="absolute top-3/6 right-4/10 w-[200px] -rotate-10 overflow-hidden rounded-2xl opacity-90 shadow-2xl"
            style={{ aspectRatio: "3/4" }}
          >
            <div
              className="h-full w-full"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.88 0.1 80) 0%, oklch(0.7 0.14 60) 100%)",
              }}
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="relative">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            One prompt, any card
          </p>
          <p className="mt-3 max-w-sm text-3xl leading-tight font-semibold tracking-tight text-background">
            Every card you&apos;ve ever organized. Saved for good.
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center bg-card px-8 py-16">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
