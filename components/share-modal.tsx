'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface ShareModalProps {
  cardId: string
  recipientName: string
  recipientEmail: string
  contributorLinkId: string
  isOpen: boolean
  onClose: () => void
  onEmailUpdate?: (email: string) => void
}

export function ShareModal({
  cardId,
  recipientName,
  recipientEmail: initialEmail,
  contributorLinkId,
  isOpen,
  onClose,
  onEmailUpdate,
}: ShareModalProps) {
  const [copied, setCopied] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || '')
  const [emailError, setEmailError] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  if (!isOpen) return null

  const contributorLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/contribute/${contributorLinkId}`
  const viewLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/view/${contributorLinkId}`

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text)
    setCopied(name)
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
    } catch (error) {
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
      await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipient_email: recipientEmail,
          status: 'sent'
        }),
      })

      onEmailUpdate?.(recipientEmail)
      
      // TODO: Integrate with email service like Resend
      // For now, we'll show a success message with the link to copy
      setEmailSent(true)
    } catch (error) {
      setEmailError('Failed to send card')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold mb-2">Share Card</h2>
          <p className="text-sm text-muted-foreground">
            Send to {recipientName} or invite others to add messages
          </p>
        </div>

        <div className="space-y-4">
          {/* Contributor Link */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Invite Others to Sign
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Share with friends and family to add their messages
            </p>
            <div className="flex gap-2">
              <Input
                value={contributorLink}
                readOnly
                className="text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(contributorLink, 'contributor')}
              >
                {copied === 'contributor' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Recipient View Link */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Card View Link
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Direct link for {recipientName} to view the card
            </p>
            <div className="flex gap-2">
              <Input
                value={viewLink}
                readOnly
                className="text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(viewLink, 'view')}
              >
                {copied === 'view' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Email Section */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium block mb-2">
              Send Card via Email
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Enter {recipientName}&apos;s email address to send the card directly
            </p>
            
            {emailSent ? (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <p className="font-medium text-primary mb-2">Card Ready to Send!</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Email integration coming soon. For now, copy the link and send it manually:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={viewLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(viewLink, 'email')}
                  >
                    {copied === 'email' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value)
                      setEmailError('')
                    }}
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive mt-1">{emailError}</p>
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
                        <Spinner className="mr-2 h-4 w-4" />
                        Saving...
                      </>
                    ) : (
                      'Save Email'
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSendEmail}
                    disabled={sending || !recipientEmail.trim()}
                  >
                    {sending ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Sending...
                      </>
                    ) : (
                      'Send Card'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onClose}
        >
          {emailSent ? 'Close' : 'Done'}
        </Button>
      </Card>
    </div>
  )
}
