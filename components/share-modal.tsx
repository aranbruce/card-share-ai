"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { apiPatch, apiPost } from "@/lib/api-client"

interface ShareModalBaseProps {
  cardId: string
  contributorLinkId: string
  isOpen: boolean
  onClose: () => void
}

interface RecipientShareModalProps extends ShareModalBaseProps {
  recipientName: string
  recipientEmail: string
  onEmailUpdate?: (email: string) => void
  /** Called after the card is first marked shared (sent_at set server-side). */
  onSentAtRecorded?: (sentAt: string) => void
}

type ContributorShareModalProps = ShareModalBaseProps

function buildViewLink(contributorLinkId: string): string {
  const path = `/view/${contributorLinkId}`
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path}`
}

function buildContributorLink(contributorLinkId: string): string {
  const path = `/contribute/${contributorLinkId}`
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path}`
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function parseContributorEmails(raw: string): string[] {
  const parts = raw.split(/[\s,;]+/).map((part) => part.trim())
  const unique = new Set<string>()
  for (const part of parts) {
    if (part) unique.add(part)
  }
  return [...unique]
}

export function RecipientShareModal({
  cardId,
  recipientName,
  recipientEmail: initialEmail,
  contributorLinkId,
  isOpen,
  onClose,
  onEmailUpdate,
  onSentAtRecorded,
}: RecipientShareModalProps) {
  const [recipientSending, setRecipientSending] = useState(false)
  const [recipientEmailSent, setRecipientEmailSent] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || "")
  const [recipientEmailError, setRecipientEmailError] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)

  const viewLink = isOpen ? buildViewLink(contributorLinkId) : ""
  const getViewLink = () => buildViewLink(contributorLinkId)

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

  const handleSaveEmail = async () => {
    if (!recipientEmail.trim()) {
      setRecipientEmailError("Please enter an email address")
      return
    }
    if (!validateEmail(recipientEmail)) {
      setRecipientEmailError("Please enter a valid email address")
      return
    }

    setRecipientEmailError("")
    setSavingEmail(true)

    try {
      await apiPatch(`/api/cards/${cardId}`, {
        recipient_email: recipientEmail,
      })
      onEmailUpdate?.(recipientEmail)
    } catch {
      setRecipientEmailError("Failed to save email")
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSendRecipientEmail = async () => {
    if (!recipientEmail.trim()) {
      setRecipientEmailError("Please enter an email address")
      return
    }
    if (!validateEmail(recipientEmail)) {
      setRecipientEmailError("Please enter a valid email address")
      return
    }

    setRecipientEmailError("")
    setRecipientSending(true)

    try {
      const response = await apiPost<{
        sentAt?: string | null
        persistenceFailed?: boolean
      }>(`/api/cards/${cardId}/send-email`, {
        kind: "recipient",
        email: recipientEmail,
      })

      if (response.sentAt) {
        onSentAtRecorded?.(response.sentAt)
      } else if (!response.persistenceFailed) {
        void recordSharedAt()
      }
      if (response.persistenceFailed) {
        setRecipientEmailError(
          "Email sent, but we could not save the card status. Please try again.",
        )
        return
      }

      onEmailUpdate?.(recipientEmail)
      setRecipientEmailSent(true)
    } catch {
      setRecipientEmailError("Failed to send recipient email")
    } finally {
      setRecipientSending(false)
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
            <DialogTitle className="text-2xl">Send to recipient</DialogTitle>
            <DialogDescription>
              Share the finished card with {recipientName}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LinkIcon className="size-4" />
              Recipient link
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
              Send via email
            </h4>

            {recipientEmailSent ? (
              <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <CheckIcon className="size-5" />
                  <p>Recipient email sent.</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  The final card link has been sent successfully.
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
                      setRecipientEmailError("")
                    }}
                    aria-invalid={!!recipientEmailError}
                  />
                  {recipientEmailError ? (
                    <p className="text-xs text-destructive">
                      {recipientEmailError}
                    </p>
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
                    onClick={handleSendRecipientEmail}
                    disabled={recipientSending || !recipientEmail.trim()}
                  >
                    {recipientSending ? (
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

export function ContributorShareModal({
  cardId,
  contributorLinkId,
  isOpen,
  onClose,
}: ContributorShareModalProps) {
  const [contributorSending, setContributorSending] = useState(false)
  const [contributorEmailSent, setContributorEmailSent] = useState(false)
  const [contributorEmails, setContributorEmails] = useState("")
  const [contributorEmailError, setContributorEmailError] = useState("")
  const [sentCount, setSentCount] = useState(0)

  const contributorLink = isOpen ? buildContributorLink(contributorLinkId) : ""
  const getContributorLink = () => buildContributorLink(contributorLinkId)

  const handleSendContributorEmails = async () => {
    const emails = parseContributorEmails(contributorEmails)
    if (emails.length === 0) {
      setContributorEmailError("Please enter at least one email address")
      return
    }

    const invalid = emails.filter((email) => !validateEmail(email))
    if (invalid.length > 0) {
      setContributorEmailError(
        invalid.length === 1
          ? `Invalid email: ${invalid[0]}`
          : "Please enter valid email addresses",
      )
      return
    }

    setContributorEmailError("")
    setContributorSending(true)

    try {
      const response = await apiPost<{ sentCount?: number }>(
        `/api/cards/${cardId}/send-email`,
        {
          kind: "contributor",
          emails,
        },
      )
      setSentCount(response.sentCount ?? emails.length)
      setContributorEmailSent(true)
    } catch {
      setContributorEmailError("Failed to send contributor emails")
    } finally {
      setContributorSending(false)
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
            <DialogTitle className="text-2xl">
              Share with contributors
            </DialogTitle>
            <DialogDescription>
              Invite people to add their messages before you send the card.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LinkIcon className="size-4" />
              Contributor link
            </h4>
            <RecipientViewLinkCopy
              viewLink={contributorLink}
              getViewLink={getContributorLink}
            />
            <p className="text-xs text-muted-foreground">
              Copy and share this link so contributors can add their messages.
            </p>
          </div>

          <div className="h-px bg-border/50" />

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MailIcon className="size-4" />
              Send via email
            </h4>

            {contributorEmailSent ? (
              <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <CheckIcon className="size-5" />
                  <p>
                    {sentCount === 1
                      ? "Contributor email sent."
                      : `${sentCount} contributor emails sent.`}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  The contributor link has been emailed successfully.
                </p>
                <RecipientViewLinkCopy
                  viewLink={contributorLink}
                  getViewLink={getContributorLink}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="contributor@example.com, friend@example.com"
                    value={contributorEmails}
                    onChange={(e) => {
                      setContributorEmails(e.target.value)
                      setContributorEmailError("")
                    }}
                    rows={3}
                    aria-invalid={!!contributorEmailError}
                  />
                  {contributorEmailError ? (
                    <p className="text-xs text-destructive">
                      {contributorEmailError}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleSendContributorEmails}
                  disabled={contributorSending || !contributorEmails.trim()}
                >
                  {contributorSending ? (
                    <>
                      <Spinner />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendIcon />
                      Send emails
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Separate multiple addresses with commas, spaces, or new lines.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
