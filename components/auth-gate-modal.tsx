"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

interface AuthGateModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: () => void
  onSignUp: () => void
}

export function AuthGateModal({
  isOpen,
  onClose,
  onLogin,
  onSignUp,
}: AuthGateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Save Your Card</DialogTitle>
          <DialogDescription className="text-base">
            Sign in or create an account to save, download, and send your card.
          </DialogDescription>
        </DialogHeader>

        {/* <div className="my-2 rounded-2xl bg-secondary/50 p-4">
          <p className="text-sm text-muted-foreground">
            Your card is safe! We&apos;ll save it automatically after you sign
            in.
          </p>
        </div> */}
        <Alert className="mb-6">
          <AlertTitle>Your card is safe!</AlertTitle>
          <AlertDescription>
            We&apos;ll save it automatically after you sign in.
          </AlertDescription>
        </Alert>

        <div className="mt-2 flex flex-col gap-3">
          <Button fullWidth onClick={onSignUp}>
            Create Account
          </Button>
          <Button fullWidth variant="outline" onClick={onLogin}>
            I Already Have an Account
          </Button>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Free account • No credit card required
        </p>
      </DialogContent>
    </Dialog>
  )
}
