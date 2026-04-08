'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { ShareModal } from '@/components/share-modal'
import { Card3D } from '@/components/card-3d'
import { ArrowLeft, Share2, Send, Copy, CheckCircle2 } from 'lucide-react'

interface CardData {
  id: string
  recipient_name: string
  recipient_email?: string
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive mb-6 max-w-3xl">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr,400px] gap-8 items-start">
          {/* Card Preview - Using Card3D component */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Card for {card.recipient_name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    From {card.sender_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    card.status === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    card.status === 'collecting' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    'bg-green-500/10 text-green-600 dark:text-green-400'
                  }`}>
                    {card.status === 'draft' && 'Draft'}
                    {card.status === 'collecting' && 'Collecting Messages'}
                    {card.status === 'sent' && 'Sent'}
                  </div>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto">
                <Card3D
                  imageUrl={card.image_url}
                  headline={card.copy_headline}
                  message={card.copy_message}
                  senderName={card.sender_name}
                  recipientName={card.recipient_name}
                  contributions={contributions}
                  editable={false}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Actions & Info */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Primary Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                {card.status === 'draft' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Card
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleStatusChange('collecting')}
                    >
                      Start Collecting Messages
                    </Button>
                  </>
                )}

                {card.status === 'collecting' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleStatusChange('sent')}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send to Recipient
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Options
                    </Button>
                  </>
                )}

                {card.status === 'sent' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    View Card Link
                  </Button>
                )}
              </div>
            </Card>

            {/* Contributor Link */}
            {card.status !== 'sent' && (
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Invite Contributors</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Share this link to collect messages from others
                </p>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/contribute/${card.contributor_link_id}`}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyContributorLink}
                    className="shrink-0"
                  >
                    {copyLinkCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </Card>
            )}

            {/* Contributions List */}
            {contributions.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Messages</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {contributions.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {contributions.map((contrib) => (
                    <div
                      key={contrib.id}
                      className="p-3 bg-muted/50 rounded-lg border border-border/50"
                    >
                      <p className="font-medium text-sm mb-1.5">
                        {contrib.contributor_name}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {contrib.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        <ShareModal
          cardId={cardId}
          recipientName={card.recipient_name}
          recipientEmail={card.recipient_email || ''}
          contributorLinkId={card.contributor_link_id}
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            loadCard() // Refresh card data to get updated email/status
          }}
          onEmailUpdate={(email) => {
            setCard(prev => prev ? { ...prev, recipient_email: email } : null)
          }}
        />
      </div>
    </div>
  )
}
