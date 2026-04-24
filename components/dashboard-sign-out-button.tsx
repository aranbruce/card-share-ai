"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function DashboardSignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
      onClick={async () => {
        await supabase.auth.signOut()
        router.push("/")
      }}
    >
      Sign out
    </Button>
  )
}
