'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

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
  onAddPage?: () => void
  showAddPageButton?: boolean
}

const MESSAGES_PER_PAGE = 3

// Simple inline edit that maintains exact same text appearance
function InlineEdit({
  value,
  onChange,
  className,
  multiline = false,
  editable = false,
}: {
  value: string
  onChange?: (value: string) => void
  className?: string
  multiline?: boolean
  editable?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
      // Auto-resize textarea to fit content
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    if (editable && onChange) {
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
    if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  // Render same content whether editing or not
  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`${className} bg-transparent border-none outline-none resize-none w-full p-0 m-0`}
        rows={multiline ? 4 : 1}
        style={{
          lineHeight: 'inherit',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          letterSpacing: 'inherit',
          color: 'inherit',
        }}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={`${className} ${editable ? 'cursor-pointer hover:bg-primary/5 rounded transition-colors' : ''}`}
    >
      {value}
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
  onAddPage,
  showAddPageButton = false,
}: Card3DProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  // Calculate pages: page 0 is the main message, subsequent pages are for contributions
  const contributionPages = []
  for (let i = 0; i < contributions.length; i += MESSAGES_PER_PAGE) {
    contributionPages.push(contributions.slice(i, i + MESSAGES_PER_PAGE))
  }
  const totalPages = 1 + contributionPages.length

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'TEXTAREA' || 
      target.closest('[data-nav]')
    ) {
      return
    }
    setIsOpen(!isOpen)
  }

  const goToPage = (page: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 3D Card Container */}
      <div 
        className="relative w-full max-w-md cursor-pointer"
        style={{ perspective: '1500px' }}
      >
        <div 
          className="relative w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Inside of card */}
          <div 
            className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900 rounded-2xl shadow-xl p-6 min-h-[500px] flex flex-col"
            style={{ transformStyle: 'preserve-3d' }}
            onClick={handleCardClick}
          >
            <div className="flex-1 flex flex-col">
              {currentPage === 0 ? (
                <div className="flex-1 flex flex-col">
                  {/* To line */}
                  <p className="text-sm text-muted-foreground italic mb-6">To: {recipientName}</p>
                  
                  {/* Message content - flex-1 to take available space */}
                  <div className="flex-1 flex flex-col justify-center">
                    {/* Greeting */}
                    <p className="text-lg text-foreground/90 mb-4">
                      Hey {recipientName},
                    </p>

                    {/* Main message */}
                    <div className="mb-4">
                      <InlineEdit
                        value={message}
                        onChange={onMessageChange}
                        multiline
                        editable={editable}
                        className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap"
                      />
                    </div>

                    {/* Signoff */}
                    <div className="mt-6">
                      <InlineEdit
                        value={signoff}
                        onChange={onSignoffChange}
                        editable={editable}
                        className="text-lg font-semibold text-foreground"
                      />
                    </div>
                  </div>

                  {/* From line */}
                  <p className="text-sm text-muted-foreground mt-6">
                    With love, {senderName}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Messages from friends & family
                  </p>
                  
                  <div className="space-y-4">
                    {contributionPages[currentPage - 1]?.map((contrib) => (
                      <div 
                        key={contrib.id} 
                        className="bg-background/50 rounded-lg p-4 border border-border/30"
                      >
                        <p className="text-base text-foreground/90 italic leading-relaxed">
                          &ldquo;{contrib.message}&rdquo;
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">
                          — {contrib.contributor_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Navigation */}
              {(totalPages > 1 || showAddPageButton) && (
                <div 
                  className="flex items-center justify-center gap-3 pt-4 mt-auto border-t border-border/30"
                  data-nav
                >
                  {totalPages > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => goToPage(currentPage - 1, e)}
                      disabled={currentPage === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => goToPage(i, e)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentPage 
                            ? 'bg-primary' 
                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                      />
                    ))}
                    
                    {/* Add Page Button */}
                    {showAddPageButton && onAddPage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddPage()
                        }}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Add a page for contributors"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Page
                      </Button>
                    )}
                  </div>
                  
                  {totalPages > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => goToPage(currentPage + 1, e)}
                      disabled={currentPage === totalPages - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Front cover */}
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                  )}
                  
                  {/* Headline overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <InlineEdit
                      value={headline}
                      onChange={onHeadlineChange}
                      editable={editable}
                      className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg"
                    />
                    <p className="text-sm mt-2 opacity-80">
                      For {recipientName}
                    </p>
                  </div>

                  {/* Click hint */}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/70 text-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                    {editable ? 'Click text to edit' : 'Click to open'}
                  </div>

                  {/* Contribution count badge */}
                  {contributions.length > 0 && (
                    <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                      {contributions.length} {contributions.length === 1 ? 'message' : 'messages'} inside
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Back of cover */}
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
