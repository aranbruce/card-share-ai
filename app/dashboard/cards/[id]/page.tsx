'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'
import Link from 'next/link'
import { ShareModal } from '@/components/share-modal'

interface CardData {
  id: string
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  copy_signoff: string
  image_url: string
  status: string
  contributor_link_id: string
}

interface Contribution {
  id: string
  contributor_name: string
  message: string
}

export default function CardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const cardId = params.id as string

  const supabase = createClient()
  const [card, setCard] = useState<CardData | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<CardData>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [copyLinkCopied, setCopyLinkCopied] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      loadCard()
    }

    checkAuth()
  }, [router, supabase, cardId])

  const loadCard = async () => {
    try {
      const response = await fetch(`/api/cards/${cardId}`)
      if (!response.ok) throw new Error('Card not found')

      const { card: cardData } = await response.json()
      setCard(cardData)
      setEditData(cardData)
      loadContributions(cardData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load card')
    } finally {
      setLoading(false)
    }
  }

  const loadContributions = async (cId: string) => {
    try {
      const response = await fetch(`/api/contribute/${cId}`)
      if (response.ok) {
        const { contributions: contribs } = await response.json()
        setContributions(contribs || [])
      }
    } catch (err) {
      console.error('Failed to load contributions:', err)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      const { card: updatedCard } = await response.json()
      setCard(updatedCard)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleSaveChanges = async () => {
    if (!card) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_headline: editData.copy_headline || card.copy_headline,
          copy_message: editData.copy_message || card.copy_message,
          copy_signoff: editData.copy_signoff || card.copy_signoff,
        }),
      })

      if (!response.ok) throw new Error('Failed to save changes')

      const { card: updatedCard } = await response.json()
      setCard(updatedCard)
      setEditMode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const copyContributorLink = () => {
    if (!card) return

    const link = `${window.location.origin}/contribute/${card.contributor_link_id}`
    navigator.clipboard.writeText(link)
    setCopyLinkCopied(true)
    setTimeout(() => setCopyLinkCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Card Not Found</h1>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Card Details</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card Preview */}
          <div className="md:col-span-2">
            <Card className="overflow-hidden">
              {card.image_url && (
                <div className="relative w-full aspect-square bg-secondary">
                  <Image
                    src={card.image_url}
                    alt="Card"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
              <div className="p-6 space-y-4">
                {editMode ? (
                  <>
                    <textarea
                      value={editData.copy_headline || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          copy_headline: e.target.value,
                        })
                      }
                      className="w-full text-xl font-bold px-2 py-1 border border-input rounded bg-secondary/50"
                    />
                    <textarea
                      value={editData.copy_message || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          copy_message: e.target.value,
                        })
                      }
                      className="w-full text-sm leading-relaxed px-2 py-1 border border-input rounded bg-secondary/50 min-h-24"
                    />
                    <textarea
                      value={editData.copy_signoff || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          copy_signoff: e.target.value,
                        })
                      }
                      className="w-full text-sm font-semibold px-2 py-1 border border-input rounded bg-secondary/50"
                    />
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false)
                          setEditData(card)
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold">{card.copy_headline}</h3>
                    <p className="text-sm leading-relaxed">
                      {card.copy_message}
                    </p>
                    <p className="text-sm font-semibold">{card.copy_signoff}</p>
                    {card.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                      >
                        Edit Copy
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar - Controls & Info */}
          <div className="space-y-4">
            {/* Status & Actions */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Card Status</h3>
              <div className="space-y-3">
                <div className="p-3 bg-secondary/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Status
                  </p>
                  <p className="font-semibold capitalize">
                    {card.status}
                  </p>
                </div>

                {card.status === 'draft' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => setShowShareModal(true)}
                    >
                      Share Card
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleStatusChange('collecting')}
                    >
                      Start Collecting
                    </Button>
                  </>
                )}

                {card.status === 'collecting' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => setShowShareModal(true)}
                    >
                      Share Card
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleStatusChange('sent')}
                    >
                      Mark as Sent
                    </Button>
                  </>
                )}

                {card.status === 'sent' && (
                  <Button
                    className="w-full"
                    onClick={() => setShowShareModal(true)}
                  >
                    View Share Links
                  </Button>
                )}
              </div>
            </Card>

            {/* Recipient Info */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Card Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-semibold">{card.recipient_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-semibold">{card.sender_name}</p>
                </div>
              </div>
            </Card>

            {/* Contributor Link */}
            {card.status !== 'sent' && (
              <Card className="p-6">
                <h3 className="font-bold mb-4">Share for Contributions</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Share this link with others to add messages
                </p>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/contribute/${card.contributor_link_id}`}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyContributorLink}
                  >
                    {copyLinkCopied ? '✓' : 'Copy'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Contributions Count */}
            {contributions.length > 0 && (
              <Card className="p-6">
                <h3 className="font-bold mb-4">
                  Messages ({contributions.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                  {contributions.map((contrib) => (
                    <div
                      key={contrib.id}
                      className="p-2 bg-secondary/50 rounded"
                    >
                      <p className="font-semibold text-xs mb-1">
                        {contrib.contributor_name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {contrib.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
          )}
        </div>

        <ShareModal
          cardId={cardId}
          recipientName={card.recipient_name}
          recipientEmail={card.recipient_email || ''}
          contributorLinkId={card.contributor_link_id}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </div>
    </div>
  )
}
