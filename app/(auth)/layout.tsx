import { AuthBrandPanel } from "@/components/auth/brand-panel"
import { Logo } from "@/components/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />

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
