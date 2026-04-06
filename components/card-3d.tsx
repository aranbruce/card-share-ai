'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  editable?: boolean
  onHeadlineChange?: (value: string) => void
  onMessageChange?: (value: string) => void
  onSignoffChange?: (value: string) => void
  onAddPage?: () => void
}

const MESSAGES_PER_PAGE = 3

// Inline edit component with identical styling
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
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

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
      className={`${className} ${editable ? 'cursor-text hover:bg-primary/5 rounded px-1 -mx-1 transition-colors' : ''}`}
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
}: Card3DProps) {
  const [currentPage, setCurrentPage] = useState(0)

  // Page 0 = Cover, Page 1 = Main message, Page 2+ = Contributor pages
  const contributionPages: Array<typeof contributions> = []
  for (let i = 0; i < contributions.length; i += MESSAGES_PER_PAGE) {
    contributionPages.push(contributions.slice(i, i + MESSAGES_PER_PAGE))
  }
  
  // Total pages: Cover + Main Message + Contribution Pages
  const totalPages = 2 + contributionPages.length

  const goToPage = (page: number) => {
    if (page < 0) return
    
    // If going beyond last page, trigger add page
    if (page >= totalPages && editable && onAddPage) {
      onAddPage()
      return
    }
    
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }

  const isLastPage = currentPage === totalPages - 1
  const canGoRight = editable || currentPage < totalPages - 1

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card Container */}
      <div className="relative w-full max-w-md">
        <div className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900 rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
          
          {/* Page Content */}
          <div className="flex-1 flex flex-col">
            {currentPage === 0 ? (
              // Cover Page
              <div className="relative flex-1 flex flex-col">
                {isGeneratingImage ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Spinner className="h-10 w-10" />
                      <p className="text-sm text-muted-foreground">Creating your card...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {imageUrl && (
                      <div className="relative flex-1 w-full">
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
                        className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg block"
                      />
                      <p className="text-sm mt-2 opacity-80">
                        For {recipientName}
                      </p>
                    </div>

                    {/* Contribution count badge */}
                    {contributions.length > 0 && (
                      <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                        {contributions.length} {contributions.length === 1 ? 'message' : 'messages'} inside
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : currentPage === 1 ? (
              // Main Message Page
              <div className="flex-1 flex flex-col p-6">
                <p className="text-sm text-muted-foreground italic mb-6">To: {recipientName}</p>
                
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-lg text-foreground/90 mb-4">
                    Hey {recipientName},
                  </p>

                  <div className="mb-4">
                    <InlineEdit
                      value={message}
                      onChange={onMessageChange}
                      multiline
                      editable={editable}
                      className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap block"
                    />
                  </div>

                  <div className="mt-6">
                    <InlineEdit
                      value={signoff}
                      onChange={onSignoffChange}
                      editable={editable}
                      className="text-lg font-semibold text-foreground block"
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-6">
                  With love, {senderName}
                </p>
              </div>
            ) : (
              // Contributor Pages
              <div className="flex-1 flex flex-col p-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Messages from friends & family
                </p>
                
                <div className="flex-1 space-y-4">
                  {contributionPages[currentPage - 2]?.map((contrib) => (
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

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Page {currentPage - 1} of {contributionPages.length}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 bg-background/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="h-10 w-10 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentPage 
                      ? 'bg-primary' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={!canGoRight}
              className={`h-10 w-10 p-0 ${isLastPage && editable ? 'text-primary' : ''}`}
              title={isLastPage && editable ? 'Add a new page' : 'Next page'}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Page indicator text */}
      <p className="text-sm text-muted-foreground">
        {currentPage === 0 && 'Cover'}
        {currentPage === 1 && 'Your message'}
        {currentPage > 1 && `Contributor messages (${currentPage - 1}/${contributionPages.length})`}
        {editable && isLastPage && (
          <span className="ml-2 text-primary">
            — Press right arrow to add a page
          </span>
        )}
      </p>
    </div>
  )
}
