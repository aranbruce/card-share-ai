'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Move, Maximize2 } from 'lucide-react'

interface Card3DProps {
  imageUrl: string
  headline: string
  message: string
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
  onAddPage?: () => void
  extraPages?: number
}

const MESSAGES_PER_PAGE = 3

// Inline edit component - uses contentEditable for truly identical sizing
function InlineEdit({
  value,
  onChange,
  className,
  editable = false,
}: {
  value: string
  onChange?: (value: string) => void
  className?: string
  editable?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const editRef = useRef<HTMLDivElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    if (editable && onChange) {
      e.stopPropagation()
      setIsEditing(true)
    }
  }

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      // Select all text
      const range = document.createRange()
      range.selectNodeContents(editRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (editRef.current) {
      const newValue = editRef.current.innerText
      if (newValue !== value) {
        onChange?.(newValue)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (editRef.current) {
        editRef.current.innerText = value
      }
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`${className} outline-none ring-1 ring-primary/30 rounded px-1 -mx-1 bg-primary/5`}
      >
        {value}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`${className} ${editable ? 'cursor-text hover:bg-primary/5 rounded px-1 -mx-1 transition-colors' : ''}`}
    >
      {value}
    </div>
  )
}

// Draggable wrapper for positioning content
function DraggableWrapper({
  children,
  editable = false,
}: {
  children: React.ReactNode
  editable?: boolean
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 100 }) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, posX: 0, posY: 0, width: 100 })

  const handleMouseDown = (e: React.MouseEvent, type: 'drag' | 'resize') => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()
    
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
      width: size.width,
    }
    
    if (type === 'drag') setIsDragging(true)
    if (type === 'resize') setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        setPosition({
          x: startPos.current.posX + dx,
          y: startPos.current.posY + dy,
        })
      }
      if (isResizing && containerRef.current) {
        const containerWidth = containerRef.current.parentElement?.offsetWidth || 300
        const dx = e.clientX - startPos.current.x
        const newWidth = startPos.current.width + (dx / containerWidth) * 100
        setSize({ width: Math.max(50, Math.min(100, newWidth)) })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing])

  return (
    <div
      ref={containerRef}
      className="relative group"
      style={{
        transform: editable ? `translate(${position.x}px, ${position.y}px)` : undefined,
        width: editable ? `${size.width}%` : '100%',
      }}
    >
      {editable && (
        <>
          {/* Drag handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full p-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
          >
            <Move className="h-3 w-3 text-muted-foreground" />
          </div>
          
          {/* Resize handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
            className="absolute -bottom-2 -right-2 bg-background border border-border rounded-full p-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
          >
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
          </div>
          
          {/* Visual border on hover */}
          <div className="absolute inset-0 border border-dashed border-transparent group-hover:border-primary/20 rounded pointer-events-none -m-2 p-2" />
        </>
      )}
      {children}
    </div>
  )
}

export function Card3D({
  imageUrl,
  headline,
  message,
  senderName,
  recipientName,
  isGeneratingImage,
  contributions = [],
  editable = false,
  onHeadlineChange,
  onMessageChange,
  onAddPage,
  extraPages = 0,
}: Card3DProps) {
  const [currentPage, setCurrentPage] = useState(0)

  // Page 0 = Cover, Page 1 = Main message, Page 2+ = Contributor/blank pages
  const contributionPages: Array<typeof contributions> = []
  for (let i = 0; i < contributions.length; i += MESSAGES_PER_PAGE) {
    contributionPages.push(contributions.slice(i, i + MESSAGES_PER_PAGE))
  }
  
  // Total pages: Cover + Main Message + Contribution Pages + Extra Blank Pages
  const blankPagesNeeded = Math.max(0, extraPages - contributionPages.length)
  const totalPages = 2 + contributionPages.length + blankPagesNeeded

  const goToPage = (page: number) => {
    if (page < 0) return
    if (page < totalPages) {
      setCurrentPage(page)
    }
  }
  
  const handleAddPage = () => {
    if (onAddPage) {
      onAddPage()
      // Navigate to the new page after adding
      setCurrentPage(totalPages)
    }
  }

  const isLastPage = currentPage === totalPages - 1
  // Always allow right navigation when in edit mode (to add pages)
  const canGoRight = currentPage < totalPages - 1 || (editable && onAddPage !== undefined)

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
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex-1 flex flex-col justify-center">
                  <DraggableWrapper editable={editable}>
                    <InlineEdit
                      value={message}
                      onChange={onMessageChange}
                      editable={editable}
                      className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap"
                    />
                  </DraggableWrapper>
                </div>
              </div>
            ) : contributionPages[currentPage - 2] ? (
              // Contributor Pages with messages
              <div className="flex-1 flex flex-col p-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Messages from friends & family
                </p>
                
                <div className="flex-1 space-y-4">
                  {contributionPages[currentPage - 2].map((contrib) => (
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
            ) : (
              // Blank pages for future contributors
              <div className="flex-1 flex flex-col p-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Messages from friends & family
                </p>
                
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg mb-2">Space reserved for messages</p>
                    <p className="text-sm">Share the contributor link to let others add their messages here</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Navigation - Outside the card */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0}
          className="h-10 w-10 p-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex gap-2 items-center">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
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
          onClick={() => isLastPage && editable ? handleAddPage() : goToPage(currentPage + 1)}
          disabled={!canGoRight && !editable}
          className="h-10 w-10 p-0"
          title={isLastPage && editable ? "Add a new page" : "Next page"}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
