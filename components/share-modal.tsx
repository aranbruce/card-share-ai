'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { CheckIcon, CopyIcon, LinkIcon, MailIcon, SendIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [copied, setCopied] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || '')
  const [emailError, setEmailError] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const viewLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/view/${contributorLinkId}`

  const recordSharedAt = async () => {
    const sentAt = new Date().toISOString()
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sent_at: sentAt }),
      })
      if (res.ok) {
        onSentAtRecorded?.(sentAt)
      }
    } catch (err) {
      console.error('Failed to record sent_at', err)
    }
  }

  const copyToClipboard = async (text: string, name: string) => {
    navigator.clipboard.writeText(text)
    setCopied(name)

    if (name === 'view' || name === 'email') {
      await recordSharedAt()
    }

    setTimeout(() => setCopied(''), 2000)
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSaveEmail = async () => {
    if (!recipientEmail.trim()) {
      setEmailError('Please enter an email address')
      return
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setEmailError('')
    setSavingEmail(true)

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: recipientEmail }),
      })

      if (!response.ok) throw new Error('Failed to save email')

      onEmailUpdate?.(recipientEmail)
    } catch {
      setEmailError('Failed to save email')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      setEmailError('Please enter an email address')
      return
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setEmailError('')
    setSending(true)

    try {
      // First save the email to the card
      const sentAt = new Date().toISOString()
      await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          sent_at: sentAt,
        }),
      })

      onEmailUpdate?.(recipientEmail)
      onSentAtRecorded?.(sentAt)

      // TODO: Integrate with email service like Resend
      // For now, we'll show a success message with the link to copy
      setEmailSent(true)
    } catch {
      setEmailError('Failed to send card')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
          {/* Recipient View Link */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LinkIcon className="size-4" />
              Direct Link
            </h4>
            <div className="flex gap-2">
              <Input
                value={viewLink}
                readOnly
                className="bg-muted/50 text-sm font-medium text-muted-foreground focus-visible:ring-0"
              />
              <Button
                size="icon"
                variant="secondary"
                className="shrink-0"
                onClick={() => copyToClipboard(viewLink, 'view')}
              >
                {copied === 'view' ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy and share this link anywhere. They will see the finished
              card.
            </p>
          </div>

          <div className="h-px bg-border/50" />

          {/* Email Section */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MailIcon className="size-4" />
              Send via Email
            </h4>

            {emailSent ? (
              <div className="space-y-3 rounded-lg border border-primary/10 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <CheckIcon className="size-5" />
                  <p>Ready to send!</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Email integration coming soon. For now, copy the link below
                  and send it manually.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={viewLink}
                    readOnly
                    className="bg-background text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copyToClipboard(viewLink, 'email')}
                  >
                    {copied === 'email' ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      <CopyIcon className="size-4" />
                    )}
                  </Button>
                </div>
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
                      setEmailError('')
                    }}
                    className={
                      emailError
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSaveEmail}
                    disabled={savingEmail || !recipientEmail.trim()}
                  >
                    {savingEmail ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Saving...
                      </>
                    ) : (
                      'Save email only'
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSendEmail}
                    disabled={sending || !recipientEmail.trim()}
                  >
                    {sending ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <SendIcon className="mr-2 size-4" />
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
