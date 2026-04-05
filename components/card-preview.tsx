'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

interface CardPreviewProps {
  imageUrl: string
  headline: string
  message: string
  signoff: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  onEditCopy?: () => void
  onRegenerateCopy?: () => Promise<void>
  onRegenerateImage?: () => Promise<void>
  onSave?: () => Promise<void>
  isSaving?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onSignoffChange?: (value: string) => void
  editMode?: boolean
  isGuest?: boolean
}

export function CardPreview({
  imageUrl,
  headline,
  message,
  signoff,
  senderName,
  recipientName,
  isGeneratingImage,
  onEditCopy,
  onRegenerateCopy,
  onRegenerateImage,
  onSave,
  isSaving,
  onHeadlineChange,
  onMessageChange,
  onSignoffChange,
  editMode,
  isGuest,
}: CardPreviewProps) {
  const [canDownload, setCanDownload] = useState(false)

  useEffect(() => {
    setCanDownload(!!imageUrl)
  }, [imageUrl])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">Preview Your Card</h2>
        <p className="text-muted-foreground">
          Review and customize before sending
        </p>
      </div>

      {/* Guest Banner */}
      {isGuest && editMode && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-center">
            <span className="font-medium">Looking good!</span>{' '}
            <span className="text-muted-foreground">
              Sign in to save, download, or send your card.
            </span>
          </p>
        </Card>
      )}

      {/* Card Display */}
      <Card className="overflow-hidden">
        {isGeneratingImage ? (
          <div className="aspect-square bg-secondary flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">Generating image...</p>
            </div>
          </div>
        ) : (
          <>
            {imageUrl && (
              <div className="aspect-square relative w-full overflow-hidden bg-secondary">
                <Image
                  src={imageUrl}
                  alt="Card image"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </>
        )}

        <div className="p-6 bg-background space-y-4">
          {editMode ? (
            <>
              <textarea
                value={headline}
                onChange={(e) => onHeadlineChange?.(e.target.value)}
                className="w-full text-xl font-bold px-2 py-1 border border-input rounded bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                value={message}
                onChange={(e) => onMessageChange?.(e.target.value)}
                className="w-full text-sm leading-relaxed px-2 py-1 border border-input rounded bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
              />
              <textarea
                value={signoff}
                onChange={(e) => onSignoffChange?.(e.target.value)}
                className="w-full text-sm font-semibold px-2 py-1 border border-input rounded bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-balance">{headline}</h3>
              <p className="text-sm leading-relaxed text-balance">{message}</p>
              <p className="text-sm font-semibold">{signoff}</p>
            </>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {editMode && (
          <>
            <div className="flex gap-2">
              {onRegenerateCopy && (
                <Button
                  variant="outline"
                  onClick={onRegenerateCopy}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Regenerate Copy
                </Button>
              )}
              {onRegenerateImage && (
                <Button
                  variant="outline"
                  onClick={onRegenerateImage}
                  className="flex-1"
                  disabled={isSaving || isGeneratingImage}
                >
                  Regenerate Image
                </Button>
              )}
            </div>
            {onSave && (
              <Button
                className="w-full"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : isGuest ? (
                  'Save Card'
                ) : (
                  'Save Card'
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Info Section */}
      <Card className="p-4 bg-secondary/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">To:</span> {recipientName}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">From:</span> {senderName}
        </p>
      </Card>
    </div>
  )
}
