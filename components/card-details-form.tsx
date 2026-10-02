"use client"

import {
  type ChangeEvent,
  type SubmitEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ChipButton } from "@/components/ui/chip-button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"
import { CreateStepIndicator } from "@/components/create-step-indicator"
import { CoverTemplatePicker } from "@/components/cover-template-picker"
import { ArrowLeft, ArrowRight, Paperclip, Sparkles, X } from "lucide-react"
import { handleImageFileChange } from "@/lib/handle-image-file-change"
import { CARD_TONES, DEFAULT_CARD_TONE } from "@/lib/card-tones"
import { templatesForOccasion } from "@/lib/card-templates"
import { cn } from "@/lib/utils"

interface CardDetailsFormProps {
  cardType: string
  onSubmit: (details: {
    cardType: string
    senderName: string
    recipientName: string
    tone?: string
    userContext?: string
    attachedImageUrl?: string
    templateId?: string
  }) => Promise<void>
  isLoading?: boolean
  onBack?: () => void
  hasGenerated?: boolean
  onContinue?: () => void
  isContinuing?: boolean
  /** Hidden while the occasion step shows, so the details survive going back. */
  hidden?: boolean
  /** Hidden on phones only, while the generated card is showing instead. */
  hiddenOnMobile?: boolean
  /** A card was generated, but with a different template from the one now picked. */
  isStale?: boolean
  /** Phones only: what Continue does once a card is generated (show it in place of the form). */
  onShowCard?: () => void
  /** Called with the chosen template (or null), so the preview can show it. */
  onTemplateChange?: (templateId: string | null) => void
  /** An error from generating or saving, shown above the buttons. */
  actionError?: string
  /** The template picked when the form first shows. */
  initialTemplateId?: string
}

const NAMES_REQUIRED_ERROR = "Please fill in the To and From fields"
const PHOTO_REQUIRED_ERROR = "Add a photo to put in the scene"

export function CardDetailsForm({
  cardType,
  onSubmit,
  isLoading,
  onBack,
  hasGenerated,
  onContinue,
  isContinuing,
  hidden,
  hiddenOnMobile,
  onShowCard,
  onTemplateChange,
  isStale,
  actionError,
  initialTemplateId,
}: CardDetailsFormProps) {
  // Steps 2 and 3 of creating a card: the cover, then who it's for.
  const [page, setPage] = useState<"cover" | "about">("cover")
  const [senderName, setSenderName] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [userContext, setUserContext] = useState("")
  const [tone, setTone] = useState<string>(DEFAULT_CARD_TONE)
  const [formError, setFormError] = useState("")
  const [uploadError, setUploadError] = useState("")
  // Required-field errors show after a submit, then follow the fields until fixed.
  const [showNameErrors, setShowNameErrors] = useState(false)
  const [showPhotoError, setShowPhotoError] = useState(false)
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<
    string | null
  >(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [pickedTemplateId, setTemplateId] = useState<string | null>(
    initialTemplateId ?? null,
  )
  const templates = templatesForOccasion(cardType)
  // A template picked for a different occasion no longer applies.
  const templateId = templates.some((t) => t.id === pickedTemplateId)
    ? pickedTemplateId
    : null
  const useTemplate = templateId !== null
  const namesMissing = !senderName || !recipientName
  const nameError = showNameErrors && namesMissing ? NAMES_REQUIRED_ERROR : ""
  const photoError =
    uploadError ||
    (showPhotoError && useTemplate && !attachedImageDataUrl
      ? PHOTO_REQUIRED_ERROR
      : "")

  useEffect(() => {
    onTemplateChange?.(templateId)
  }, [templateId, onTemplateChange])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileRequestRef = useRef(0)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setIsReadingFile(true)
    const reqId = ++fileRequestRef.current
    requestAnimationFrame(() => {
      handleImageFileChange(
        e,
        (url) => {
          if (reqId !== fileRequestRef.current) return
          setAttachedImageDataUrl(url)
          setIsReadingFile(false)
        },
        (msg) => {
          if (reqId === fileRequestRef.current) setUploadError(msg)
        },
        uploadError,
      )
    })
  }

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError("")

    if (useTemplate && !attachedImageDataUrl) {
      setShowPhotoError(true)
      setPage("cover")
      return
    }
    if (page === "cover") {
      setPage("about")
      return
    }
    if (namesMissing) {
      setShowNameErrors(true)
      document.getElementById(recipientName ? "sender" : "recipient")?.focus()
      return
    }

    try {
      await onSubmit({
        cardType,
        senderName,
        recipientName,
        tone,
        userContext: userContext.trim() || undefined,
        attachedImageUrl: attachedImageDataUrl ?? undefined,
        templateId: templateId ?? undefined,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <aside
      className={cn(
        "flex min-h-svh flex-col border-r border-line bg-card px-7 py-4 md:sticky md:top-0 md:h-svh md:min-h-0 md:overflow-y-auto",
        hidden && "hidden",
        !hidden && hiddenOnMobile && "hidden md:flex",
      )}
    >
      <Logo className="self-start" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setFormError("")
          if (page === "about") setPage("cover")
          else onBack?.()
        }}
        className="mt-6 -ml-4 self-start text-muted-foreground"
      >
        <ArrowLeft />
        Back
      </Button>

      <CreateStepIndicator
        step={page === "cover" ? 2 : 3}
        total={3}
        className="mt-5"
      />

      {/* Heading */}
      <div className="mt-3.5">
        {page === "about" ? (
          <h2 className="text-[38px] leading-[1.05] font-semibold tracking-[-0.03em]">
            Tell us
            <br />
            about{" "}
            <span className="text-muted-foreground">
              {recipientName || "the recipient"}
            </span>
          </h2>
        ) : (
          <h2 className="text-[38px] leading-[1.05] font-semibold tracking-[-0.03em]">
            Design <br />
            <span className="text-muted-foreground">the cover</span>
          </h2>
        )}
        <p className="mt-2.5 text-sm text-muted-foreground">
          {page === "about"
            ? "You can regenerate anything after this step"
            : templates.length > 0
              ? "Put them in a funny scene, or skip this and we’ll design a cover from your details"
              : "Add a reference photo if you like, or we’ll design a cover from your details"}
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-7 flex flex-1 flex-col gap-4"
      >
        {page === "about" ? (
          <>
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
                aria-invalid={nameError && !recipientName ? true : undefined}
                aria-describedby={
                  nameError && !recipientName ? "names-error" : undefined
                }
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
                aria-invalid={nameError && !senderName ? true : undefined}
                aria-describedby={
                  nameError && !senderName ? "names-error" : undefined
                }
                variant="soft"
              />
              <FieldError id="names-error">{nameError}</FieldError>
            </div>

            {/* Context */}
            <div>
              <label
                htmlFor="context"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Context{" "}
                <span className="font-normal opacity-60">(optional)</span>
              </label>
              <Textarea
                id="context"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Any details to personalize the card? e.g. loves botanical illustration, just got promoted, turning 30"
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
                {CARD_TONES.map((t) => (
                  <ChipButton
                    size="sm"
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
          </>
        ) : (
          <>
            {/* Template */}
            {templates.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Template
                </div>
                <CoverTemplatePicker
                  templates={templates}
                  selectedId={templateId}
                  onSelect={setTemplateId}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Photo */}
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                {useTemplate ? (
                  <>
                    Photo of {recipientName || "them"}{" "}
                    <span className="font-normal opacity-60">
                      (clear and facing the camera works best)
                    </span>
                  </>
                ) : (
                  <>
                    Reference photo{" "}
                    <span className="font-normal opacity-60">(optional)</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isLoading}
                onChange={handleFileChange}
              />
              {isReadingFile ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground">
                  <Spinner className="size-3.5" />
                  Compressing…
                </div>
              ) : attachedImageDataUrl ? (
                <div className="relative w-fit overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachedImageDataUrl}
                    alt={useTemplate ? "Face photo" : "Reference"}
                    className="max-h-48 max-w-full"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="absolute bottom-2 left-2 h-auto rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
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
                      setUploadError("")
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    disabled={isLoading}
                    className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white/80 disabled:pointer-events-auto disabled:cursor-not-allowed"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  data-invalid={photoError ? "" : undefined}
                  aria-describedby={photoError ? "photo-error" : undefined}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-destructive data-invalid:hover:border-destructive"
                >
                  <Paperclip className="size-3.5" />
                  {useTemplate
                    ? `Add a photo of ${recipientName || "them"}`
                    : "Attach a reference photo"}
                </button>
              )}
              <FieldError id="photo-error">{photoError}</FieldError>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-4 pt-4">
          {(formError || actionError) && (
            <Alert variant="destructive">
              <AlertDescription>{formError || actionError}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2.5">
            {page === "cover" ? (
              <Button
                type="submit"
                size="default"
                className="flex-1"
                disabled={isReadingFile}
              >
                Continue
                <ArrowRight />
              </Button>
            ) : hasGenerated ? (
              <>
                <Button
                  type="submit"
                  variant="outline"
                  size="default"
                  className="flex-1"
                  disabled={isLoading || isContinuing || isReadingFile}
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <Sparkles />
                      Regenerate
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="default"
                  className="flex-1"
                  disabled={isLoading || isContinuing}
                  onClick={() => {
                    // Phones show the form or the card, not both: Continue goes back to the
                    // card, where its own Continue saves it.
                    if (
                      onShowCard &&
                      window.matchMedia("(max-width: 767px)").matches
                    ) {
                      onShowCard()
                    } else {
                      onContinue?.()
                    }
                  }}
                >
                  {isContinuing ? (
                    <>
                      <Spinner />
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
                disabled={isLoading || isReadingFile}
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    Generating…
                  </>
                ) : isStale ? (
                  <>
                    <Sparkles />
                    Regenerate
                  </>
                ) : (
                  <>Generate card</>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </aside>
  )
}
