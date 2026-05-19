"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RecipientViewLinkCopy } from "@/components/recipient-view-link-copy"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { CheckIcon, LinkIcon, MailIcon, SendIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiPatch } from "@/lib/api-client"

interface ShareModalProps {
  cardId: string
  recipientName: string
  recipientEmail: string
  contributorLinkId: string
  isOpen: boolean
  onClose: () => void
  onEmailUpdate?: (email: string) => void
  /** Called after the card is first marked shared (sent_at set server-side). */
  onSentAtRecorded?: (sentAt: string) => void
}

export function ShareModal({
  cardId,
  recipientName,
  recipientEmail: initialEmail,
  contributorLinkId,
  isOpen,
  onClose,
  onEmailUpdate,
  onSentAtRecorded,
}: ShareModalProps) {
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || "")
  const [emailError, setEmailError] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)

  const viewLink = isOpen
    ? `${window.location.origin}/view/${contributorLinkId}`
    : ""
  const getViewLink = () =>
    `${window.location.origin}/view/${contributorLinkId}`

  const recordSharedAt = async () => {
    const sentAt = new Date().toISOString()
    try {
      await apiPatch(`/api/cards/${cardId}`, { sent_at: sentAt })
      onSentAtRecorded?.(sentAt)
    } catch (err) {
      console.error("Failed to record sent_at", err)
    }
  }

  const handleLinkCopied = () => {
    void recordSharedAt()
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSaveEmail = async () => {
    if (!recipientEmail.trim()) {
      setEmailError("Please enter an email address")
      return
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setEmailError("")
    setSavingEmail(true)

    try {
      await apiPatch(`/api/cards/${cardId}`, {
        recipient_email: recipientEmail,
      })
      onEmailUpdate?.(recipientEmail)
    } catch {
      setEmailError("Failed to save email")
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      setEmailError("Please enter an email address")
      return
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setEmailError("")
    setSending(true)

    try {
      const sentAt = new Date().toISOString()
      await apiPatch(`/api/cards/${cardId}`, {
        recipient_email: recipientEmail,
        sent_at: sentAt,
      })

      onEmailUpdate?.(recipientEmail)
      onSentAtRecorded?.(sentAt)
      setEmailSent(true)
    } catch {
      setEmailError("Failed to send card")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl">Send Card</DialogTitle>
            <DialogDescription>
              Deliver the finished card directly to {recipientName}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LinkIcon className="size-4" />
              Direct Link
            </h4>
            <RecipientViewLinkCopy
              viewLink={viewLink}
              getViewLink={getViewLink}
              onCopied={handleLinkCopied}
            />
            <p className="text-xs text-muted-foreground">
              Copy and share this link anywhere. They will see the finished
              card.
            </p>
          </div>

          <div className="h-px bg-border/50" />

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MailIcon className="size-4" />
              Send via Email
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Coming soon
              </span>
            </h4>

            {emailSent ? (
              <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <CheckIcon className="size-5" />
                  <p>Ready to send!</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Email integration coming soon. For now, copy the link below
                  and send it manually.
                </p>
                <RecipientViewLinkCopy
                  viewLink={viewLink}
                  getViewLink={getViewLink}
                  onCopied={handleLinkCopied}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value)
                      setEmailError("")
                    }}
                    aria-invalid={!!emailError}
                  />
                  {emailError ? (
                    <p className="text-xs text-destructive">{emailError}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleSaveEmail}
                    disabled={savingEmail || !recipientEmail.trim()}
                  >
                    {savingEmail ? (
                      <>
                        <Spinner />
                        Saving...
                      </>
                    ) : (
                      "Save email only"
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleSendEmail}
                    disabled={sending || !recipientEmail.trim()}
                  >
                    {sending ? (
                      <>
                        <Spinner />
                        Sending...
                      </>
                    ) : (
                      <>
                        <SendIcon />
                        Send email
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  We&apos;ll email a beautiful invitation to view the card.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
