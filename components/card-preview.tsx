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
    <div className="space-y-10 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold mb-3 tracking-tight">Your Card</h2>
        <p className="text-muted-foreground text-lg">
          {editMode
            ? coverOnly
              ? <>Preview your cover, then save. After saving, you&apos;ll go to the next step to add your personal message.{isGuest && <>{' '}<span className="text-muted-foreground/70">Sign in to save your card.</span></>}</>
              : <>Use arrows to flip pages. Click any text to edit it.{isGuest && <>{' '}<span className="text-muted-foreground/70">Sign in to save, download, or send your card.</span></>}</>
            : 'Use arrows to flip through the card'}
        </p>
      </div>

      {/* 3D Card Display with Inline Editing + Save Button constrained to card width */}
      <div className="w-full max-w-lg mx-auto space-y-8 p-8 md:p-12 bg-secondary/20 border border-border/30 rounded-[2.5rem] relative">
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
            className="w-full h-14 rounded-full text-lg shadow-sm font-medium mt-4"
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
