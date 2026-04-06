'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

interface Card3DProps {
  imageUrl: string
  headline: string
  message: string
  signoff: string
  senderName: string
  recipientName: string
  isGeneratingImage?: boolean
  contributions?: Array<{
    id: string
    contributor_name: string
    message: string
  }>
  // Editing props
  editable?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onSignoffChange?: (value: string) => void
}

function InlineEdit({
  value,
  onChange,
  className,
  multiline = false,
  placeholder = 'Click to edit...',
}: {
  value: string
  onChange?: (value: string) => void
  className?: string
  multiline?: boolean
  placeholder?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    if (onChange) {
      e.stopPropagation()
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onChange?.(editValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (!onChange) {
    return <span className={className}>{value}</span>
  }

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} bg-white/90 dark:bg-black/70 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary resize-none w-full`}
        rows={multiline ? 4 : 1}
        style={{ minHeight: multiline ? '100px' : 'auto' }}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={`${className} cursor-pointer hover:bg-white/20 dark:hover:bg-black/20 rounded px-1 -mx-1 transition-colors group relative inline-block`}
      title="Click to edit"
    >
      {value || placeholder}
      <span className="absolute -right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
        ✎
      </span>
    </span>
  )
}

export function Card3D({
  imageUrl,
  headline,
  message,
  signoff,
  senderName,
  recipientName,
  isGeneratingImage,
  contributions = [],
  editable = false,
  onHeadlineChange,
  onMessageChange,
  onSignoffChange,
}: Card3DProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on an editable element
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA' || target.closest('[data-editable]')) {
      return
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 3D Card Container */}
      <div 
        className="relative w-full max-w-md cursor-pointer"
        style={{ perspective: '1500px' }}
      >
        {/* Card wrapper for 3D space */}
        <div 
          className="relative w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Inside of card (visible when open) */}
          <div 
            className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900 rounded-2xl shadow-xl p-6 min-h-[500px] flex flex-col"
            style={{ 
              transformStyle: 'preserve-3d',
            }}
            onClick={handleCardClick}
          >
            {/* Inside left page */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground italic">To: {recipientName}</p>
                
                {/* Main message */}
                <div className="space-y-3 py-4 border-b border-border/50" data-editable>
                  <div className="text-lg leading-relaxed text-foreground/90">
                    <InlineEdit
                      value={message}
                      onChange={editable ? onMessageChange : undefined}
                      multiline
                      className="text-lg leading-relaxed text-foreground/90 text-balance block"
                      placeholder="Click to add a message..."
                    />
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    <InlineEdit
                      value={signoff}
                      onChange={editable ? onSignoffChange : undefined}
                      className="text-base font-semibold text-foreground"
                      placeholder="Click to add sign-off..."
                    />
                  </div>
                </div>

                {/* Contributions */}
                {contributions.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Messages from others
                    </p>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {contributions.map((contrib) => (
                        <div 
                          key={contrib.id} 
                          className="bg-background/50 rounded-lg p-3 border border-border/30"
                        >
                          <p className="text-sm text-foreground/80 italic">
                            &ldquo;{contrib.message}&rdquo;
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            — {contrib.contributor_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                With love, {senderName}
              </p>
            </div>
          </div>

          {/* Front cover (folds open) */}
          <div 
            className="absolute inset-0 w-full rounded-2xl shadow-2xl overflow-hidden transition-transform duration-700 ease-in-out"
            style={{ 
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center',
              transform: isOpen ? 'rotateY(-160deg)' : 'rotateY(0deg)',
              backfaceVisibility: 'hidden',
            }}
            onClick={handleCardClick}
          >
            {/* Front of cover */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-rose-100 via-amber-50 to-orange-100 dark:from-stone-700 dark:via-stone-800 dark:to-stone-900"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {isGeneratingImage ? (
                <div className="w-full h-full flex items-center justify-center min-h-[500px]">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-10 w-10" />
                    <p className="text-sm text-muted-foreground">Creating your card...</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full min-h-[500px] flex flex-col">
                  {/* Card image */}
                  {imageUrl && (
                    <div className="relative flex-1 w-full overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt="Card cover"
                        fill
                        className="object-cover"
                        crossOrigin="anonymous"
                        priority
                      />
                      {/* Gradient overlay for text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                  )}
                  
                  {/* Headline overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white" data-editable>
                    <div className="text-2xl md:text-3xl font-bold drop-shadow-lg">
                      <InlineEdit
                        value={headline}
                        onChange={editable ? onHeadlineChange : undefined}
                        className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg text-balance"
                        placeholder="Click to add headline..."
                      />
                    </div>
                    <p className="text-sm mt-2 opacity-80">
                      For {recipientName}
                    </p>
                  </div>

                  {/* Click hint */}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/70 text-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                    {editable ? 'Click text to edit, card to open' : 'Click to open'}
                  </div>
                </div>
              )}
            </div>

            {/* Back of cover (inside left when opened) */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900 p-6 flex items-center justify-center"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-center space-y-2">
                <p className="text-lg font-serif italic text-muted-foreground">
                  Made with love
                </p>
                <div className="w-16 h-px bg-border mx-auto" />
                <p className="text-sm text-muted-foreground">
                  CardAI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Open/Close Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="mt-2"
      >
        {isOpen ? 'Close Card' : 'Open Card'}
      </Button>
    </div>
  )
}
