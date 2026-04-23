"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
const TONES = ["Warm", "Playful", "Dry", "Sincere", "Short"]

interface CardDetailsFormProps {
  cardType: string
  onSubmit: (details: {
    cardType: string
    senderName: string
    recipientName: string
    customMessage?: string
  }) => Promise<void>
  isLoading?: boolean
  onBack?: () => void
}

export function CardDetailsForm({
  cardType,
  onSubmit,
  isLoading,
  onBack,
}: CardDetailsFormProps) {
  const [senderName, setSenderName] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [tone, setTone] = useState("Warm")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!senderName || !recipientName) {
      setError("Please fill in the To and From fields")
      return
    }

    // Prepend tone to context so the AI uses it
    const tonePrefix = `Tone: ${tone}.`
    const context = customMessage.trim()
      ? `${tonePrefix} ${customMessage.trim()}`
      : tonePrefix

    try {
      await onSubmit({
        cardType,
        senderName,
        recipientName,
        customMessage: context,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <aside className="flex flex-col border-r border-border bg-card px-7 py-8">
        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to occasions
        </button>

        {/* Heading */}
        <div className="mt-6">
          <h2 className="text-[38px] leading-[1.05] font-semibold tracking-[-0.03em]">
            Tell us
            <br />
            {recipientName ? (
              <>about {recipientName}.</>
            ) : (
              <span className="text-muted-foreground">about who.</span>
            )}
          </h2>
          <p className="mt-2.5 text-sm text-muted-foreground">
            You can regenerate anything after this step.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-7 flex flex-1 flex-col gap-4"
        >
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* To */}
          <div>
            <label
              htmlFor="recipient"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              To
            </label>
            <Input
              id="recipient"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Recipient's name"
              disabled={isLoading}
              required
              variant="soft"
            />
          </div>

          {/* From */}
          <div>
            <label
              htmlFor="sender"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              From
            </label>
            <Input
              id="sender"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name or group name"
              disabled={isLoading}
              required
              variant="soft"
            />
          </div>

          {/* Context */}
          <div>
            <label
              htmlFor="context"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Context <span className="font-normal opacity-60">(optional)</span>
            </label>
            <Textarea
              id="context"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Any details to personalise the card? e.g. loves botanical illustration, just got promoted, turning 30."
              disabled={isLoading}
              variant="card"
            />
          </div>

          {/* Tone chips */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              Tone
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  disabled={isLoading}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    tone === t
                      ? "border-transparent bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex gap-2.5 pt-4">
            <Button
              type="submit"
              variant="brand"
              size="default"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Generating…
                </>
              ) : (
                <>
                  <svg
                    className="mr-1.5 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  Generate card
                </>
              )}
            </Button>
          </div>
        </form>
    </aside>
  )
}
