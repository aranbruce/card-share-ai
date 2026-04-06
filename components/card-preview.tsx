'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  isGuest?: boolean
  contributions?: Array<{
    id: string
    contributor_name: string
    message: string
  }>
  extraPages?: number
  onAddPage?: () => void
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
  isGuest,
  contributions = [],
  extraPages = 0,
  onAddPage,
}: CardPreviewProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Card</h2>
        <p className="text-muted-foreground">
          {editMode 
            ? 'Use arrows to flip pages. Click any text to edit it.' 
            : 'Use arrows to flip through the card'}
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

      {/* 3D Card Display with Inline Editing */}
      <Card3D
        imageUrl={imageUrl}
        headline={headline}
        message={message}
        senderName={senderName}
        recipientName={recipientName}
        isGeneratingImage={isGeneratingImage}
        contributions={contributions}
        editable={editMode}
        onHeadlineChange={onHeadlineChange}
        onMessageChange={onMessageChange}
        extraPages={extraPages}
        onAddPage={onAddPage}
        onRegenerateHeadline={onRegenerateHeadline}
        onRegenerateMessage={onRegenerateMessage}
        onRegenerateImage={onRegenerateImage}
        isRegeneratingHeadline={isRegeneratingHeadline}
        isRegeneratingMessage={isRegeneratingMessage}
        isRegeneratingImage={isRegeneratingImage}
      />

      {/* Save Button */}
      {editMode && onSave && (
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
          ) : (
            'Save Card'
          )}
        </Button>
      )}
    </div>
  )
}
