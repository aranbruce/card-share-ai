"use client"

import { type ChangeEvent, type SubmitEvent, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, X } from "lucide-react"
import { handleImageFileChange } from "@/lib/handle-image-file-change"

const TONES = ["Warm", "Playful", "Dry", "Sincere", "Short"]

interface CardDetailsFormProps {
  cardType: string
  onSubmit: (details: {
    cardType: string
    senderName: string
    recipientName: string
    customMessage?: string
    sourceImageUrl?: string
  }) => Promise<void>
  isLoading?: boolean
  onBack?: () => void
  hasGenerated?: boolean
  onContinue?: () => void
  isContinuing?: boolean
}

export function CardDetailsForm({
  cardType,
  onSubmit,
  isLoading,
  onBack,
  hasGenerated,
  onContinue,
  isContinuing,
}: CardDetailsFormProps) {
  const [senderName, setSenderName] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [tone, setTone] = useState("Warm")
  const [error, setError] = useState("")
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<
    string | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) =>
    handleImageFileChange(e, setAttachedImageDataUrl, setError)

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
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
        sourceImageUrl: attachedImageDataUrl ?? undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <aside className="flex flex-col border-r border-border bg-card px-7 py-8">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 self-start text-muted-foreground"
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
      </Button>

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
      <form onSubmit={handleSubmit} className="mt-7 flex flex-1 flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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

        {/* Reference photo */}
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Reference photo{" "}
            <span className="font-normal opacity-60">(optional)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isLoading}
            onChange={handleFileChange}
          />
          {attachedImageDataUrl ? (
            <div className="relative w-fit overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImageDataUrl}
                alt="Reference"
                className="max-h-48 max-w-full"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute bottom-2 left-2 h-auto rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm hover:bg-black/70"
              >
                Change photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove reference photo"
                onClick={() => {
                  setAttachedImageDataUrl(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                disabled={isLoading}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground/70 disabled:opacity-50"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach a reference photo
            </button>
          )}
        </div>

        {/* Tone chips */}
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Tone
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <ChipButton
                key={t}
                onClick={() => setTone(t)}
                disabled={isLoading}
                active={tone === t}
              >
                {t}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2.5 pt-4">
          {hasGenerated ? (
            <>
              <Button
                type="submit"
                variant="outline"
                size="default"
                className="flex-1"
                disabled={isLoading || isContinuing}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Regenerating…
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
                    Regenerate
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="default"
                className="flex-1"
                disabled={isLoading || isContinuing}
                onClick={onContinue}
              >
                {isContinuing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Saving…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </>
          ) : (
            <Button
              type="submit"
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
          )}
        </div>
      </form>
    </aside>
  )
}
