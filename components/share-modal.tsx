'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import Link from 'next/link'

interface ShareModalProps {
  cardId: string
  recipientName: string
  recipientEmail: string
  contributorLinkId: string
  isOpen: boolean
  onClose: () => void
}

export function ShareModal({
  cardId,
  recipientName,
  recipientEmail,
  contributorLinkId,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState('')
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const contributorLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/contribute/${contributorLinkId}`
  const cardLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/cards/${cardId}`

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text)
    setCopied(name)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleSendEmail = async () => {
    setSending(true)
    try {
      // This would integrate with an email service like Resend in production
      alert(`Would send card to ${recipientEmail}. Email integration coming soon!`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6 space-y-6">
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
              Contributor Link
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Share with others to add messages before sending
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
                {copied === 'contributor' ? '✓' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Recipient Link */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Recipient View Link
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Final link for the recipient to view the card
            </p>
            <div className="flex gap-2">
              <Input
                value={cardLink}
                readOnly
                className="text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(cardLink, 'recipient')}
              >
                {copied === 'recipient' ? '✓' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Email Section */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium block mb-3">
              Send to {recipientName}
            </label>
            <Button
              className="w-full"
              onClick={handleSendEmail}
              disabled={sending}
            >
              {sending ? 'Sending...' : `Send Email to ${recipientEmail}`}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Email integration coming soon. For now, share the link manually.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onClose}
        >
          Done
        </Button>
      </Card>
    </div>
  )
}
