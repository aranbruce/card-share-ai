'use client'

import { useState, useEffect } from 'react'
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
  contributions = [],
}: CardPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Card</h2>
        <p className="text-muted-foreground">
          {editMode ? 'Click the card to open it and see the inside message' : 'Preview your virtual card'}
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

      {/* 3D Card Display */}
      <Card3D
        imageUrl={imageUrl}
        headline={headline}
        message={message}
        signoff={signoff}
        senderName={senderName}
        recipientName={recipientName}
        isGeneratingImage={isGeneratingImage}
        contributions={contributions}
      />

      {/* Edit Section (collapsible) */}
      {editMode && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="w-full"
          >
            {isEditing ? 'Hide Editor' : 'Edit Card Text'}
          </Button>

          {isEditing && (
            <Card className="p-4 space-y-4 bg-secondary/30">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Headline
                </label>
                <textarea
                  value={headline}
                  onChange={(e) => onHeadlineChange?.(e.target.value)}
                  className="w-full mt-1 text-lg font-bold px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => onMessageChange?.(e.target.value)}
                  className="w-full mt-1 text-sm px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sign-off
                </label>
                <textarea
                  value={signoff}
                  onChange={(e) => onSignoffChange?.(e.target.value)}
                  className="w-full mt-1 text-sm font-semibold px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={1}
                />
              </div>
            </Card>
          )}
        </div>
      )}

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
