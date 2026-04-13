import { Logo } from '@/components/logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md p-8 sm:p-10">
        {children}
      </div>
    </div>
  )
}
