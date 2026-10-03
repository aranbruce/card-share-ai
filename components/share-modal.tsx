"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RecipientViewLinkCopy } from "@/components/recipient-view-link-copy"
import { ShareAppButtons } from "@/components/share-app-buttons"
import type { ShareApp, ShareContent } from "@/lib/share-app-urls"
import posthog from "posthog-js"
import { useState, type ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  LinkIcon,
  MailIcon,
  SendIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
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

interface ContributorShareModalProps extends ShareModalBaseProps {
  recipientName: string
}

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

/**
 * Which timezone the picker's times are in, e.g. "Times are in London time (BST)". It's the
 * browser's own; the label is for the chosen day, so it follows daylight saving.
 */
function timeZoneNote(date: string): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const city = zone?.split("/").pop()?.replace(/_/g, " ")
  const day = new Date(`${date || toDateInputValue(new Date())}T12:00`)
  const short = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(day)
    .find((part) => part.type === "timeZoneName")?.value
  if (city && short) return `Times are in ${city} time (${short})`
  return short ? `Times are in your timezone (${short})` : ""
}

/** The default time offered for a scheduled send: 9am tomorrow. */
function defaultSendAtParts(): { date: string; hour: number } {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return toSendAtParts(date)
}

/** The dialog's screens: the three ways to send, and the first screen to pick one. */
type SendView = "choose" | "link" | "email" | "schedule"

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
  const [savingCardStatus, setSavingCardStatus] = useState(false)
  const [schedule, setSchedule] = useState(sendSchedule)
  const [view, setView] = useState<SendView>("choose")
  const [editingSchedule, setEditingSchedule] = useState(false)
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

  const showView = (next: SendView) => {
    setView(next)
    setEditingSchedule(false)
    setScheduleError("")
    setRecipientSendError("")
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
      setEditingSchedule(false)
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

  const emailField = (
    <div>
      <label
        htmlFor={recipientFields.fieldProps("email").id}
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        {recipientName}&apos;s email
      </label>
      <Input
        {...recipientFields.fieldProps("email")}
        type="email"
        placeholder="recipient@example.com"
        value={recipientEmail}
        onChange={(e) => {
          setRecipientEmail(e.target.value)
          setRecipientSendError("")
          setScheduleError("")
        }}
      />
      <FieldError id={recipientFields.errorId("email")}>
        {recipientFields.error("email")}
      </FieldError>
    </div>
  )

  const titles: Record<SendView, { title: string; description: string }> = {
    choose: {
      title: `Send to ${recipientName}`,
      description: "How would you like to send the finished card?",
    },
    link: {
      title: "Share a link",
      description: `Send it to ${recipientName} however you like. They'll see the finished card.`,
    },
    email: {
      title: "Send by email",
      description: `We'll email ${recipientName} a link to the card now.`,
    },
    schedule: {
      title: "Schedule for later",
      description: `Pick when we email ${recipientName} the card. Contributors are asked to sign by then, and can still add messages after.`,
    },
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
          {view !== "choose" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground"
              onClick={() => showView("choose")}
            >
              <ArrowLeftIcon />
              Back
            </Button>
          ) : null}
          <DialogHeader>
            <DialogTitle className="text-2xl">{titles[view].title}</DialogTitle>
            <DialogDescription>{titles[view].description}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6">
          {view === "choose" ? (
            <>
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
              <div className="space-y-2">
                <SendOption
                  icon={<LinkIcon />}
                  title="Share a link"
                  description="Paste it into WhatsApp, Slack, a text or anywhere else"
                  onClick={() => showView("link")}
                />
                <SendOption
                  icon={<MailIcon />}
                  title="Send by email"
                  description={`Email ${recipientName} the card now`}
                  onClick={() => showView("email")}
                />
                <SendOption
                  icon={<CalendarClockIcon />}
                  title="Schedule for later"
                  description={
                    isScheduled && schedule ? (
                      <>
                        Scheduled for <LocalDateTime iso={schedule.send_at} />
                      </>
                    ) : (
                      "Pick a date and time for us to email it"
                    )
                  }
                  highlighted={isScheduled}
                  onClick={() => showView("schedule")}
                />
              </div>
            </>
          ) : null}

          {view === "link" ? (
            <>
              <RecipientViewLinkCopy
                viewLink={viewLink}
                getViewLink={getViewLink}
                onCopied={handleLinkCopied}
              />
              <ShareAppDivider />
              <ShareAppButtons
                content={recipientShareContent(viewLink, recipientName)}
                onShare={(app) => {
                  trackLinkShared(cardId, "recipient", app)
                  void recordSharedAt()
                }}
              />
            </>
          ) : null}

          {view === "email" ? (
            recipientEmailSent ? (
              <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <CheckIcon className="size-5" />
                  <p>Email sent to {recipientEmail.trim()}</p>
                </div>
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
              </div>
            ) : (
              <>
                {emailField}
                {recipientSendError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{recipientSendError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  type="button"
                  className="w-full"
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
              </>
            )
          ) : null}

          {view === "schedule" ? (
            isScheduled && schedule && !editingSchedule ? (
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
                  . Contributors are asked to sign by then.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRecipientEmail(schedule.recipient_email)
                      setSendAtParts(toSendAtParts(new Date(schedule.send_at)))
                      setEditingSchedule(true)
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
              <>
                {schedule?.state === "sent" && schedule.sent_at ? (
                  <p className="text-sm text-muted-foreground">
                    Last sent as scheduled on{" "}
                    <LocalDateTime iso={schedule.sent_at} />.
                  </p>
                ) : null}
                {emailField}
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
                <p className="text-xs text-muted-foreground">
                  {timeZoneNote(sendAtParts.date)}
                </p>
                {scheduleError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{scheduleError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleScheduleSend}
                  disabled={scheduling || !recipientEmail.trim()}
                >
                  {scheduling ? <Spinner /> : <CalendarClockIcon />}
                  {isScheduled ? "Reschedule" : "Schedule send"}
                </Button>
              </>
            )
          ) : null}
          {view === "schedule" &&
          isScheduled &&
          !editingSchedule &&
          scheduleError ? (
            <Alert variant="destructive">
              <AlertDescription>{scheduleError}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** One way to send the card, on the dialog's first screen. */
function SendOption({
  icon,
  title,
  description,
  highlighted,
  onClick,
}: {
  icon: ReactNode
  title: string
  description: ReactNode
  /** Marks an option that's already in use (e.g. a pending scheduled send). */
  highlighted?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-foreground/30 [&_svg]:size-4",
        highlighted
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-background",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRightIcon className="text-muted-foreground" />
    </button>
  )
}

/** Separates a link's Copy button from the app share buttons. */
function ShareAppDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border/50" />
      or send it in an app
      <div className="h-px flex-1 bg-border/50" />
    </div>
  )
}

/** What app shares say when sending the finished card to the recipient. */
function recipientShareContent(
  link: string,
  recipientName: string,
): ShareContent {
  const name = recipientName.trim()
  return {
    link,
    message: name
      ? `We made you a card, ${name}! Open it here:`
      : "We made you a card! Open it here:",
    emailSubject: name ? `A card for ${name}` : "A card for you",
  }
}

/** What app shares say when inviting people to sign. */
function contributorShareContent(
  link: string,
  recipientName: string,
): ShareContent {
  const name = recipientName.trim()
  return {
    link,
    message: name
      ? `Help sign ${name}'s card! Add your message here:`
      : "Help sign the group card! Add your message here:",
    emailSubject: name ? `Sign ${name}'s card` : "Sign the group card",
  }
}

function trackLinkShared(
  cardId: string,
  audience: "recipient" | "contributors",
  app: ShareApp,
) {
  posthog.capture("card_link_shared", { card_id: cardId, audience, app })
}

export function ContributorShareModal({
  cardId,
  recipientName,
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
            <ShareAppDivider />
            <ShareAppButtons
              content={contributorShareContent(contributorLink, recipientName)}
              onShare={(app) => trackLinkShared(cardId, "contributors", app)}
            />
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
