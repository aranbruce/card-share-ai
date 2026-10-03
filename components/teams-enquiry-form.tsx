"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { posthogAiHeaders } from "@/lib/posthog-client"
import {
  getTeamsEnquiryErrors,
  TEAM_INTERESTS,
  TEAM_SIZES,
  TEAMS_ENQUIRY_FIELD_LABELS,
  TEAMS_ENQUIRY_MAX_LENGTHS,
  type TeamsEnquiryField,
} from "@/lib/teams-enquiry"
import { cn } from "@/lib/utils"

type TeamSize = (typeof TEAM_SIZES)[number]
type TeamInterest = (typeof TEAM_INTERESTS)[number]

const inputClass =
  "h-10 rounded-lg bg-card text-sm focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/15"

export function TeamsEnquiryForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [size, setSize] = useState<TeamSize | "">("")
  const [interests, setInterests] = useState<TeamInterest[]>([])
  const [tried, setTried] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [sentTo, setSentTo] = useState<{ name: string; email: string } | null>(
    null,
  )

  const values = { name, email, company, size, interests }
  const errors = tried ? getTeamsEnquiryErrors(values) : {}
  const invalidFields = Object.keys(errors) as TeamsEnquiryField[]
  const alertText = invalidFields.length
    ? `Check ${invalidFields.length === 1 ? "this field" : "these fields"}: ${invalidFields
        .map((field) => TEAMS_ENQUIRY_FIELD_LABELS[field])
        .join(", ")}`
    : serverError

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTried(true)
    setServerError("")
    if (Object.keys(getTeamsEnquiryErrors(values)).length) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/teams-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...posthogAiHeaders() },
        body: JSON.stringify(values),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        setServerError(
          data?.error ?? "We couldn't send your request. Please try again.",
        )
        return
      }
      setSentTo({ name: name.trim(), email: email.trim() })
    } catch {
      setServerError("We couldn't send your request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="flex min-h-105 flex-col items-center justify-center gap-3.5 text-center"
      >
        <span className="flex size-13 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_0_8px_color-mix(in_oklab,var(--brand)_12%,transparent)]">
          <Check className="size-5.5" strokeWidth={3} aria-hidden />
        </span>
        <span className="mt-2 text-[22px] font-bold tracking-tight">
          Thanks, {sentTo.name.split(" ")[0]}
        </span>
        <span className="max-w-80 text-[15px] leading-[1.55] text-pretty text-muted-foreground">
          We&apos;ll email a quote to{" "}
          <span className="font-medium text-foreground">{sentTo.email}</span>.
          In the meantime you can try a card for free.
        </span>
        <Button asChild variant="outline" size="sm" className="mt-1.5">
          <Link href="/create">Start a free card</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Get a quote for your team"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Morgan"
            autoComplete="name"
            maxLength={TEAMS_ENQUIRY_MAX_LENGTHS.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "teams-name-error" : undefined}
            className={inputClass}
          />
          <FieldError id="teams-name-error" className="mt-0">
            {errors.name}
          </FieldError>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Work email</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="alex@company.com"
            autoComplete="email"
            maxLength={TEAMS_ENQUIRY_MAX_LENGTHS.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "teams-email-error" : undefined}
            className={inputClass}
          />
          <FieldError id="teams-email-error" className="mt-0">
            {errors.email}
          </FieldError>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Company</span>
        <Input
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          placeholder="Northwind"
          autoComplete="organization"
          maxLength={TEAMS_ENQUIRY_MAX_LENGTHS.company}
          aria-invalid={errors.company ? true : undefined}
          aria-describedby={errors.company ? "teams-company-error" : undefined}
          className={inputClass}
        />
        <FieldError id="teams-company-error" className="mt-0">
          {errors.company}
        </FieldError>
      </label>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.size ? "teams-size-error" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">Team size</legend>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_SIZES.map((option) => {
            const selected = size === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setSize(option)}
                className={cn(
                  "flex h-9 cursor-pointer items-center rounded-lg border px-3.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : errors.size
                      ? "border-destructive bg-card"
                      : "border-border bg-card hover:border-foreground/30",
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
        <FieldError id="teams-size-error" className="mt-0">
          {errors.size}
        </FieldError>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          What are you interested in?{" "}
          <span className="font-normal text-muted-foreground">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_INTERESTS.map((option) => {
            const selected = interests.includes(option)
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setInterests((current) =>
                    selected
                      ? current.filter((item) => item !== option)
                      : [...current, option],
                  )
                }
                className={cn(
                  "flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13.5px] transition-colors",
                  selected
                    ? "border-brand bg-brand/10 text-[#d63f2f]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {selected && (
                  <Check className="size-3.25" strokeWidth={3} aria-hidden />
                )}
                {option}
              </button>
            )
          })}
        </div>
      </fieldset>

      {alertText && (
        <div
          role="alert"
          className="flex gap-2.5 rounded-[10px] border border-destructive/20 bg-destructive/8 px-3.5 py-3 text-sm leading-[1.45] text-destructive-text"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{alertText}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="h-11.5 rounded-[10px] text-[15px] shadow-[0_12px_28px_-14px_rgba(255,90,74,0.8)]"
      >
        {submitting ? "Sending…" : "Request a quote"}
      </Button>
      <p className="text-center text-[12.5px] text-muted-foreground">
        We only use your details to reply to this request.
      </p>
    </form>
  )
}
