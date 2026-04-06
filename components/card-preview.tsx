'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Card3D } from '@/components/card-3d'

interface CardPreviewProps {
  imageUrl: string
  headline: string
  message: string
  signoff: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  onRegenerateCopy?: () => Promise<void>
  onRegenerateImage?: () => Promise<void>
  onSave?: () => Promise<void>
  isSaving?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onSignoffChange?: (value: string) => void
  editMode?: boolean
  isGuest?: boolean
  contributions?: Array<{
    id: string
    contributor_name: string
    message: string
  }>
}

export function CardPreview({
  imageUrl,
  headline,
  message,
  signoff,
  senderName,
  recipientName,
  isGeneratingImage,
  onRegenerateCopy,
  onRegenerateImage,
  onSave,
  isSaving,
  onHeadlineChange,
  onMessageChange,
  onSignoffChange,
  editMode,
  isGuest,
  contributions = [],
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
        signoff={signoff}
        senderName={senderName}
        recipientName={recipientName}
        isGeneratingImage={isGeneratingImage}
        contributions={contributions}
        editable={editMode}
        onHeadlineChange={onHeadlineChange}
        onMessageChange={onMessageChange}
        onSignoffChange={onSignoffChange}
        onAddPage={() => {
          alert('Share the contributor link to let friends and family add their messages. Each page can hold 3 messages!')
        }}
      />

      {/* Action Buttons */}
      {editMode && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {onRegenerateCopy && (
              <Button
                variant="outline"
                onClick={onRegenerateCopy}
                className="flex-1"
                disabled={isSaving}
              >
                Regenerate Text
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
              ) : (
                'Save Card'
              )}
            </Button>
          )}
        </div>
      )}

      {/* Info Section */}
      <Card className="p-4 bg-secondary/50">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span><span className="font-medium">To:</span> {recipientName}</span>
          <span><span className="font-medium">From:</span> {senderName}</span>
        </div>
      </Card>
    </div>
  )
}
