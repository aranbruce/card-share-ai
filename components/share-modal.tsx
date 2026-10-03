"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RecipientViewLinkCopy } from "@/components/recipient-view-link-copy"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import {
  CalendarClockIcon,
  CheckIcon,
  LinkIcon,
  MailIcon,
  SendIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError, apiDelete, apiPatch, apiPost } from "@/lib/api-client"
import type { CardSendSchedule } from "@/lib/card-send-schedule"
import { LocalDateTime } from "@/components/local-date-time"
import {
  MAX_CONTRIBUTOR_EMAILS,
  MAX_CONTRIBUTOR_EMAILS_ERROR,
} from "@/lib/email/constants"
import { emailError, isValidEmail } from "@/lib/form-validation"
import { useFieldErrors } from "@/hooks/use-field-errors"

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
  /** The card's scheduled send, if it has one. */
  sendSchedule: CardSendSchedule | null
  onSendScheduleChange?: (schedule: CardSendSchedule | null) => void
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

function parseContributorEmails(raw: string): string[] {
  const parts = raw.split(/[\s,;]+/).map((part) => part.trim())
  const unique = new Set<string>()
  for (const part of parts) {
    if (part) unique.add(part)
  }
  return [...unique]
}

function contributorEmailsError(raw: string): string {
  const emails = parseContributorEmails(raw)
  if (emails.length === 0) return "Please enter at least one email address"
  const invalid = emails.filter((email) => !isValidEmail(email))
  if (invalid.length === 1) return `Invalid email: ${invalid[0]}`
  if (invalid.length > 1) return "Please enter valid email addresses"
  if (emails.length > MAX_CONTRIBUTOR_EMAILS)
    return MAX_CONTRIBUTOR_EMAILS_ERROR
  return ""
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** A `date` input value (local calendar day) for a date. */
function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Scheduled sends go out on the hour (the cron runs hourly), so times are whole hours. */
const SEND_HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/** An hour of the day in the viewer's locale, e.g. "9:00 AM" or "09:00". */
function hourLabel(hour: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour))
}

/** Whether an hour on a local date has already started, so a send then can't be scheduled. */
function isPastHour(date: string, hour: number): boolean {
  return new Date(`${date}T${pad2(hour)}:00`).getTime() <= Date.now()
}

/** The local date and hour of a time, for the picker. */
function toSendAtParts(date: Date): { date: string; hour: number } {
  return { date: toDateInputValue(date), hour: date.getHours() }
}

/** The default time offered for a scheduled send: 9am tomorrow. */
function defaultSendAtParts(): { date: string; hour: number } {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return toSendAtParts(date)
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
  sendSchedule,
  onSendScheduleChange,
}: RecipientShareModalProps) {
  const [recipientSending, setRecipientSending] = useState(false)
  const [recipientEmailSent, setRecipientEmailSent] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || "")
  const [recipientSendError, setRecipientSendError] = useState("")
  const [recipientPersistenceWarning, setRecipientPersistenceWarning] =
    useState<string | null>(null)
  const [pendingSentAt, setPendingSentAt] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingCardStatus, setSavingCardStatus] = useState(false)
  const [schedule, setSchedule] = useState(sendSchedule)
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [sendAtParts, setSendAtParts] = useState(defaultSendAtParts)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState("")
  const isScheduled = schedule?.state === "scheduled"

  const recipientFields = useFieldErrors(
    { email: emailError(recipientEmail) },
    { email: `recipient-email-${cardId}` },
  )

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

  const handleRetrySaveCardStatus = async () => {
    const email = recipientEmail.trim()
    if (!email || !pendingSentAt) return

    setSavingCardStatus(true)
    try {
      const { card } = await apiPatch<{
        card: { recipient_email?: string; sent_at?: string | null }
      }>(`/api/cards/${cardId}`, {
        recipient_email: email,
        sent_at: pendingSentAt,
      })
      const savedEmail = card.recipient_email?.trim() || email
      const savedSentAt = card.sent_at ?? pendingSentAt
      onEmailUpdate?.(savedEmail)
      if (savedSentAt) {
        onSentAtRecorded?.(savedSentAt)
      }
      setRecipientPersistenceWarning(null)
      setPendingSentAt(null)
    } catch (err) {
      setRecipientPersistenceWarning(
        err instanceof ApiError
          ? err.message
          : "Could not save card status. Refresh the page and try again.",
      )
    } finally {
      setSavingCardStatus(false)
    }
  }

  const handleSaveEmail = async () => {
    setRecipientSendError("")
    if (!recipientFields.validate()) return
    const email = recipientEmail.trim()
    if (email !== recipientEmail) {
      setRecipientEmail(email)
    }

    setSavingEmail(true)

    try {
      await apiPatch(`/api/cards/${cardId}`, {
        recipient_email: email,
      })
      onEmailUpdate?.(email)
    } catch (err) {
      setRecipientSendError(
        err instanceof ApiError ? err.message : "Failed to save email",
      )
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSendRecipientEmail = async () => {
    setRecipientSendError("")
    if (!recipientFields.validate()) return
    const email = recipientEmail.trim()
    if (email !== recipientEmail) {
      setRecipientEmail(email)
    }

    setRecipientSending(true)

    try {
      const response = await apiPost<{
        sentAt: string
        persistenceFailed?: boolean
      }>(`/api/cards/${cardId}/send-email`, {
        kind: "recipient",
        email,
      })

      if (response.persistenceFailed) {
        onEmailUpdate?.(email)
        setPendingSentAt(response.sentAt ?? new Date().toISOString())
        setRecipientPersistenceWarning(
          "Email was sent. We could not save the card status. Use Save card status below.",
        )
        setRecipientEmailSent(true)
        return
      }

      onSentAtRecorded?.(response.sentAt)
      onEmailUpdate?.(email)
      setRecipientPersistenceWarning(null)
      setPendingSentAt(null)
      setRecipientEmailSent(true)
    } catch (err) {
      setRecipientSendError(
        err instanceof ApiError
          ? err.message
          : "Failed to send recipient email",
      )
    } finally {
      setRecipientSending(false)
    }
  }

  const updateSchedule = (next: CardSendSchedule | null) => {
    setSchedule(next)
    onSendScheduleChange?.(next)
  }

  const handleScheduleSend = async () => {
    setScheduleError("")
    setRecipientSendError("")
    if (!recipientFields.validate()) return
    const email = recipientEmail.trim()
    const sendAt = new Date(`${sendAtParts.date}T${pad2(sendAtParts.hour)}:00`)
    if (!sendAtParts.date || Number.isNaN(sendAt.getTime())) {
      setScheduleError("Choose a valid date and time")
      return
    }

    setScheduling(true)
    try {
      const { schedule: saved } = await apiPost<{
        schedule: CardSendSchedule
      }>(`/api/cards/${cardId}/schedule`, {
        email,
        sendAt: sendAt.toISOString(),
      })
      updateSchedule(saved)
      onEmailUpdate?.(email)
      setShowSchedulePicker(false)
    } catch (err) {
      setScheduleError(
        err instanceof ApiError ? err.message : "Failed to schedule the card",
      )
    } finally {
      setScheduling(false)
    }
  }

  const handleCancelSchedule = async () => {
    setScheduleError("")
    setScheduling(true)
    try {
      await apiDelete(`/api/cards/${cardId}/schedule`)
      updateSchedule(null)
    } catch (err) {
      setScheduleError(
        err instanceof ApiError
          ? err.message
          : "Failed to cancel the scheduled send",
      )
    } finally {
      setScheduling(false)
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
                {recipientPersistenceWarning ? (
                  <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-sm text-amber-950 dark:text-amber-50">
                      {recipientPersistenceWarning}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetrySaveCardStatus}
                      disabled={savingCardStatus}
                    >
                      {savingCardStatus ? (
                        <>
                          <Spinner />
                          Saving...
                        </>
                      ) : (
                        "Save card status"
                      )}
                    </Button>
                  </div>
                ) : null}
                <RecipientViewLinkCopy
                  viewLink={viewLink}
                  getViewLink={getViewLink}
                  onCopied={handleLinkCopied}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={recipientFields.fieldProps("email").id}
                    className="sr-only"
                  >
                    Recipient email address
                  </label>
                  <Input
                    {...recipientFields.fieldProps("email")}
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value)
                      setRecipientSendError("")
                    }}
                  />
                  <FieldError id={recipientFields.errorId("email")}>
                    {recipientFields.error("email")}
                  </FieldError>
                </div>

                {recipientSendError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{recipientSendError}</AlertDescription>
                  </Alert>
                ) : null}

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

          <div className="h-px bg-border/50" />

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClockIcon className="size-4" />
              Schedule for later
            </h4>

            {isScheduled && schedule && !showSchedulePicker ? (
              <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-sm text-foreground">
                  Sends to{" "}
                  <span className="font-medium">
                    {schedule.recipient_email}
                  </span>{" "}
                  on{" "}
                  <span className="font-medium">
                    <LocalDateTime iso={schedule.send_at} />
                  </span>
                  . Contributors see this as the deadline to sign.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRecipientEmail(schedule.recipient_email)
                      setSendAtParts(toSendAtParts(new Date(schedule.send_at)))
                      setShowSchedulePicker(true)
                    }}
                    disabled={scheduling}
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelSchedule}
                    disabled={scheduling}
                  >
                    {scheduling ? <Spinner /> : null}
                    Cancel scheduled send
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule?.state === "sent" && schedule.sent_at ? (
                  <p className="text-sm text-muted-foreground">
                    Sent as scheduled on{" "}
                    <LocalDateTime iso={schedule.sent_at} />.
                  </p>
                ) : null}
                {schedule?.state === "failed" ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      The scheduled send on{" "}
                      <LocalDateTime iso={schedule.send_at} /> didn&apos;t go
                      through. Check the email address, then send it now or
                      schedule it again.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {showSchedulePicker ? (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label
                          htmlFor={`send-date-${cardId}`}
                          className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                          Send on
                        </label>
                        <Input
                          id={`send-date-${cardId}`}
                          type="date"
                          value={sendAtParts.date}
                          min={toDateInputValue(new Date())}
                          onChange={(e) => {
                            setSendAtParts((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                            setScheduleError("")
                          }}
                        />
                      </div>
                      <div className="w-32">
                        <label
                          htmlFor={`send-hour-${cardId}`}
                          className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                          At
                        </label>
                        <select
                          id={`send-hour-${cardId}`}
                          value={sendAtParts.hour}
                          onChange={(e) => {
                            setSendAtParts((prev) => ({
                              ...prev,
                              hour: Number(e.target.value),
                            }))
                            setScheduleError("")
                          }}
                          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none md:text-sm dark:bg-input/30"
                        >
                          {SEND_HOURS.map((hour) => (
                            <option
                              key={hour}
                              value={hour}
                              disabled={isPastHour(sendAtParts.date, hour)}
                            >
                              {hourLabel(hour)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowSchedulePicker(false)
                          setScheduleError("")
                        }}
                        disabled={scheduling}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleScheduleSend}
                        disabled={scheduling || !recipientEmail.trim()}
                      >
                        {scheduling ? <Spinner /> : <CalendarClockIcon />}
                        {isScheduled ? "Reschedule" : "Schedule send"}
                      </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      We&apos;ll email the card to the address above then, and
                      contributors will see it as the deadline to sign.
                    </p>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSchedulePicker(true)}
                  >
                    <CalendarClockIcon />
                    Pick a date and time
                  </Button>
                )}
              </div>
            )}
            {scheduleError ? (
              <Alert variant="destructive">
                <AlertDescription>{scheduleError}</AlertDescription>
              </Alert>
            ) : null}
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
  const [contributorSendError, setContributorSendError] = useState("")
  const [contributorPartialNotice, setContributorPartialNotice] = useState<
    string | null
  >(null)
  const [sentCount, setSentCount] = useState(0)

  const contributorFields = useFieldErrors(
    { emails: contributorEmailsError(contributorEmails) },
    { emails: `contributor-emails-${cardId}` },
  )
  const contributorEmailsErrorId = contributorFields.errorId("emails")
  const contributorPartialNoticeId = `contributor-partial-notice-${cardId}`

  const contributorLink = isOpen ? buildContributorLink(contributorLinkId) : ""
  const getContributorLink = () => buildContributorLink(contributorLinkId)

  const handleSendContributorEmails = async () => {
    setContributorSendError("")
    if (!contributorFields.validate()) return
    const emails = parseContributorEmails(contributorEmails)

    setContributorPartialNotice(null)
    setContributorSending(true)

    try {
      const response = await apiPost<{
        sentCount?: number
        partial?: boolean
        failedEmails?: { email: string; error: string }[]
      }>(`/api/cards/${cardId}/send-email`, {
        kind: "contributor",
        emails,
      })

      if (response.partial && response.failedEmails?.length) {
        setSentCount(response.sentCount ?? 0)
        setContributorEmails(
          response.failedEmails.map((entry) => entry.email).join(", "),
        )
        setContributorPartialNotice(
          `Sent ${response.sentCount ?? 0} invite(s). ${response.failedEmails.length} could not be sent. Update and retry below.`,
        )
        return
      }

      setSentCount(response.sentCount ?? emails.length)
      setContributorEmailSent(true)
    } catch (err) {
      setContributorSendError(
        err instanceof ApiError
          ? err.message
          : "Failed to send contributor emails",
      )
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
              ariaLabel="Contributor link"
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
                  ariaLabel="Contributor link"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {contributorPartialNotice ? (
                  <p
                    id={contributorPartialNoticeId}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-50"
                  >
                    {contributorPartialNotice}
                  </p>
                ) : null}
                <div>
                  <label
                    htmlFor={contributorFields.fieldProps("emails").id}
                    className="sr-only"
                  >
                    Contributor email addresses
                  </label>
                  <Textarea
                    {...contributorFields.fieldProps("emails")}
                    placeholder="contributor@example.com, friend@example.com"
                    value={contributorEmails}
                    onChange={(e) => {
                      setContributorEmails(e.target.value)
                      setContributorSendError("")
                      setContributorPartialNotice(null)
                    }}
                    rows={3}
                    aria-describedby={
                      [
                        contributorPartialNotice
                          ? contributorPartialNoticeId
                          : null,
                        contributorFields.error("emails")
                          ? contributorEmailsErrorId
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  />
                  <FieldError id={contributorEmailsErrorId}>
                    {contributorFields.error("emails")}
                  </FieldError>
                </div>

                {contributorSendError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{contributorSendError}</AlertDescription>
                  </Alert>
                ) : null}

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
                  Separate multiple addresses with commas, spaces, or new lines
                  (up to {MAX_CONTRIBUTOR_EMAILS}).
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
