'use client'

import { useState } from 'react'
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
}: Card3DProps) {
  const [isOpen, setIsOpen] = useState(false)

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
          >
            {/* Inside left page */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground italic">To: {recipientName}</p>
                
                {/* Main message */}
                <div className="space-y-3 py-4 border-b border-border/50">
                  <p className="text-lg leading-relaxed text-foreground/90 text-balance">
                    {message}
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {signoff}
                  </p>
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
            onClick={() => setIsOpen(!isOpen)}
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
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h2 className="text-2xl md:text-3xl font-bold text-balance drop-shadow-lg">
                      {headline}
                    </h2>
                    <p className="text-sm mt-2 opacity-80">
                      For {recipientName}
                    </p>
                  </div>

                  {/* Click hint */}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/70 text-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                    Click to open
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
