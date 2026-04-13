'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Card3D } from '@/components/card-3d'

interface CardPreviewProps {
  imageUrl: string
  headline: string
  message: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  onRegenerateHeadline?: (prompt: string) => Promise<void>
  onRegenerateMessage?: (prompt: string) => Promise<void>
  onRegenerateImage?: (prompt: string) => Promise<void>
  onSave?: () => Promise<void>
  isSaving?: boolean
  isRegeneratingHeadline?: boolean
  isRegeneratingMessage?: boolean
  isRegeneratingImage?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  editMode?: boolean
  /** Cover + headline only; inner message page is not edited here. */
  coverOnly?: boolean
  isGuest?: boolean
  contributions?: Array<{
    id: string
    message: string
    is_creator?: boolean | null
  }>
  extraPages?: number
  onAddPage?: () => void
  messageFontSize?: number
  onMessageFontSizeChange?: (size: number) => void
  messagePageIndex?: number
  onMessagePageIndexChange?: (page: number) => void
}

export function CardPreview({
  imageUrl,
  headline,
  message,
  senderName,
  recipientName,
  isGeneratingImage,
  onRegenerateHeadline,
  onRegenerateMessage,
  onRegenerateImage,
  onSave,
  isSaving,
  isRegeneratingHeadline,
  isRegeneratingMessage,
  isRegeneratingImage,
  onHeadlineChange,
  onMessageChange,
  editMode,
  coverOnly = false,
  isGuest,
  contributions = [],
  extraPages = 0,
  onAddPage,
  messageFontSize = 18,
  onMessageFontSizeChange,
  messagePageIndex = 1,
  onMessagePageIndexChange,
}: CardPreviewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="text-center">
        <h2 className="mb-3 text-3xl font-extrabold tracking-tight">
          Your Card
        </h2>
        <p className="text-lg text-muted-foreground">
          {editMode ? (
            coverOnly ? (
              <>
                Preview your cover, then save. After saving, you&apos;ll go to
                the next step to add your personal message.
                {isGuest && (
                  <>
                    {' '}
                    <span className="text-muted-foreground/70">
                      Sign in to save your card.
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                Use arrows to flip pages. Click any text to edit it.
                {isGuest && (
                  <>
                    {' '}
                    <span className="text-muted-foreground/70">
                      Sign in to save, download, or send your card.
                    </span>
                  </>
                )}
              </>
            )
          ) : (
            'Use arrows to flip through the card'
          )}
        </p>
      </div>

      {/* 3D Card Display with Inline Editing + Save Button constrained to card width */}
      <div className="relative mx-auto w-full max-w-lg space-y-8 rounded-3xl border border-border/30 bg-secondary/20 p-8 md:p-12">
        <Card3D
          imageUrl={imageUrl}
          headline={headline}
          message={message}
          senderName={senderName}
          recipientName={recipientName}
          isGeneratingImage={isGeneratingImage}
          contributions={contributions}
          editable={Boolean(editMode)}
          coverOnly={coverOnly}
          onHeadlineChange={onHeadlineChange}
          onMessageChange={coverOnly ? undefined : onMessageChange}
          extraPages={extraPages}
          onAddPage={coverOnly ? undefined : onAddPage}
          onRegenerateHeadline={onRegenerateHeadline}
          onRegenerateMessage={coverOnly ? undefined : onRegenerateMessage}
          onRegenerateImage={onRegenerateImage}
          isRegeneratingHeadline={isRegeneratingHeadline}
          isRegeneratingMessage={coverOnly ? false : isRegeneratingMessage}
          isRegeneratingImage={isRegeneratingImage}
          messageFontSize={messageFontSize}
          onMessageFontSizeChange={onMessageFontSizeChange}
          messagePageIndex={messagePageIndex}
          onMessagePageIndexChange={onMessagePageIndexChange}
        />

        {/* Save Button - same width as card */}
        {editMode && onSave && (
          <Button
            size="lg"
            className="mt-4 w-full"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Card'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
