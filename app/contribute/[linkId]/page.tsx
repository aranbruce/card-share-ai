'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Card3D } from '@/components/card-3d'
import { forCardDisplay } from '@/lib/card-body'
import type { CardComposeDraft } from '@/lib/card-compose-draft'
import { Logo } from '@/components/logo'

interface Contribution {
  id: string
  message: string
  created_at: string
  position_x?: number | null
  position_y?: number | null
  width_percent?: number | null
  page_index?: number | null
  font_size?: number | null
  is_creator?: boolean | null
}

interface CardData {
  id: string
  card_type: string
  recipient_name: string
  sender_name: string
  copy_headline: string
  copy_message: string
  image_url: string
  sent_at?: string | null
  extra_pages?: number
}

export default function ContributeCardPage() {
  const params = useParams()
  const linkId = params.linkId as string

  const [card, setCard] = useState<CardData | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitNonce, setSubmitNonce] = useState(0)
  const [composeDraft, setComposeDraft] = useState<CardComposeDraft | null>(
    null,
  )
  const [composeDraftRegenerating, setComposeDraftRegenerating] =
    useState(false)
  /** contributionId → editToken (from POST only; never exposed via GET) */
  const [contributionEditTokens, setContributionEditTokens] = useState<
    Record<string, string>
  >({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composeDraftRef = useRef<CardComposeDraft | null>(null)
  const [regeneratingContributionId, setRegeneratingContributionId] = useState<
    string | null
  >(null)

  useEffect(() => {
    composeDraftRef.current = composeDraft
  }, [composeDraft])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`contribute_tokens_${linkId}`)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const next: Record<string, string> = {}
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof k === 'string' && typeof v === 'string' && v.trim()) {
              next[k] = v
            }
          }
          if (Object.keys(next).length > 0) {
            setContributionEditTokens(next)
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [linkId])

  useEffect(() => {
    const loadCard = async () => {
      try {
        const response = await fetch(`/api/contribute/${linkId}`)
        if (!response.ok) throw new Error('Card not found')

        const { card: cardData, contributions: contribs } =
          await response.json()
        setCard(cardData)
        setContributions(contribs)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card')
      } finally {
        setLoading(false)
      }
    }

    loadCard()
  }, [linkId])

  const saveContributionPatch = useCallback(
    async (
      contributionId: string,
      updates: {
        message?: string
        position_x?: number
        position_y?: number
        width_percent?: number
        page_index?: number
        font_size?: number
      },
      editToken: string,
    ) => {
      const response = await fetch(`/api/contribute/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributionId, editToken, ...updates }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.error(
          'Failed to save contribution',
          typeof payload.error === 'string' ? payload.error : payload,
        )
      }
    },
    [linkId],
  )

  const handleContributionEdit = useCallback(
    (contributionId: string, value: string) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, message: value } : c,
        ),
      )
      const token = contributionEditTokens[contributionId]
      if (!token) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void saveContributionPatch(contributionId, { message: value }, token)
      }, 600)
    },
    [contributionEditTokens, saveContributionPatch],
  )

  const handleContributionLayoutChange = useCallback(
    (
      contributionId: string,
      layout: {
        x: number
        y: number
        widthPercent: number
        pageIndex: number
        fontSize?: number
      },
    ) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId
            ? {
                ...c,
                position_x: layout.x,
                position_y: layout.y,
                width_percent: layout.widthPercent,
                page_index: layout.pageIndex,
                font_size: layout.fontSize ?? c.font_size,
              }
            : c,
        ),
      )
      const token = contributionEditTokens[contributionId]
      if (!token) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void saveContributionPatch(
          contributionId,
          {
            position_x: layout.x,
            position_y: layout.y,
            width_percent: layout.widthPercent,
            page_index: layout.pageIndex,
            font_size: layout.fontSize,
          },
          token,
        )
      }, 200)
    },
    [contributionEditTokens, saveContributionPatch],
  )

  const handleContributionRegenerateMessage = useCallback(
    async (contributionId: string, prompt: string) => {
      if (!card) return
      const token = contributionEditTokens[contributionId]
      if (!token) return
      const current =
        contributions.find((c) => c.id === contributionId)?.message ?? ''
      setRegeneratingContributionId(contributionId)
      try {
        const response = await fetch('/api/regenerate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'contribution_message',
            cardType: card.card_type || 'custom',
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            currentValue: current,
            userPrompt: prompt,
          }),
        })
        if (!response.ok) throw new Error('Failed to refine message')
        const { text } = (await response.json()) as { text?: string }
        const next = String(text ?? '').trim()
        setContributions((prev) =>
          prev.map((c) =>
            c.id === contributionId ? { ...c, message: next } : c,
          ),
        )
        await saveContributionPatch(contributionId, { message: next }, token)
      } catch (e) {
        console.error(e)
      } finally {
        setRegeneratingContributionId(null)
      }
    },
    [card, contributionEditTokens, contributions, saveContributionPatch],
  )

  const handleComposeDraftRegenerate = useCallback(
    async (prompt: string) => {
      if (!card) return
      const current = composeDraftRef.current?.message ?? ''
      setComposeDraftRegenerating(true)
      try {
        const response = await fetch('/api/regenerate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'contribution_message',
            cardType: card.card_type || 'custom',
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            currentValue: current,
            userPrompt: prompt,
          }),
        })
        if (!response.ok) throw new Error('Failed to refine message')
        const { text } = (await response.json()) as { text?: string }
        const next = String(text ?? '').trim()
        setComposeDraft((d) => (d ? { ...d, message: next } : d))
      } catch (e) {
        console.error(e)
      } finally {
        setComposeDraftRegenerating(false)
      }
    },
    [card],
  )

  const cancelCompose = useCallback(() => {
    setComposeDraft(null)
    setError('')
  }, [])

  const submitComposeDraft = useCallback(async () => {
    const draft = composeDraftRef.current
    if (!draft) return

    setSubmitting(true)
    setError('')

    const msg = draft.message.trim()
    if (!msg) {
      setError('Please enter a message')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/contribute/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          positionX: draft.x,
          positionY: draft.y,
          widthPercent: 75,
          pageIndex: draft.pageIndex,
          fontSize: draft.fontSize,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Failed to add contribution',
        )
      }

      const { contribution, editToken } = payload as {
        contribution?: Contribution
        editToken?: string
      }
      const token = typeof editToken === 'string' ? editToken.trim() : ''
      const ok =
        contribution &&
        typeof contribution.id === 'string' &&
        contribution.id.length > 0 &&
        token.length > 0

      if (!ok) {
        setError(
          'Your message could not be fully saved on this device. Please try again.',
        )
        return
      }

      setContributions((prev) => [...prev, contribution])
      setSubmitNonce((n) => n + 1)
      setContributionEditTokens((prev) => {
        const next = { ...prev, [contribution.id]: token }
        try {
          sessionStorage.setItem(
            `contribute_tokens_${linkId}`,
            JSON.stringify(next),
          )
        } catch {
          /* ignore */
        }
        return next
      })
      setComposeDraft(null)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add message')
    } finally {
      setSubmitting(false)
    }
  }, [linkId])

  const { bodyMessage, displayContributions } = useMemo(
    () =>
      card
        ? forCardDisplay(contributions, card.copy_message)
        : { bodyMessage: '', displayContributions: [] as Contribution[] },
    [contributions, card],
  )

  /** One note per device/session: tokens are only set after a successful POST. */
  const canPlaceNewGuestMessage = useMemo(
    () => Object.keys(contributionEditTokens).length === 0,
    [contributionEditTokens],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Card Not Found</h1>
          <p className="text-muted-foreground">
            The card you&apos;re looking for doesn&apos;t exist or has been
            sent.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-rose-50/50 via-background to-amber-50/50 dark:from-stone-900 dark:via-background dark:to-stone-900">
      <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-center border-b border-border/40 bg-background/80 backdrop-blur-md">
        <Logo />
      </header>
      <main className="flex-1 p-4 pt-8 md:p-8 md:pt-12">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold">
              {card.sent_at ? 'Sign this card' : "You're Invited!"}
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              {card.sent_at
                ? 'The card may already be with the recipient — you can still add or edit your note from this device using the link you used before.'
                : canPlaceNewGuestMessage
                  ? 'Flip to the friends & family page and click where you want your note. Then type your message; drag and resize like when creating the card.'
                  : 'Flip to the friends & family page to find your note. You can edit the text, drag it, and resize it from this device.'}
            </p>
          </div>

          {submitted && (
            <div className="rounded border border-green-500/20 bg-green-500/10 p-3 text-center text-sm text-green-700 dark:text-green-400">
              Message added! Find your note on the messages page—you can edit
              text, drag, and resize it.
            </div>
          )}

          <Card3D
            imageUrl={card.image_url}
            headline={card.copy_headline}
            message={bodyMessage}
            senderName={card.sender_name || 'Someone special'}
            recipientName={card.recipient_name || 'You'}
            contributions={displayContributions}
            extraPages={card.extra_pages || 0}
            hideEmptyCenterMessageBody={true}
            contributeSubmitNonce={submitNonce}
            editableContributionIds={Object.keys(contributionEditTokens)}
            onContributionEdit={handleContributionEdit}
            onContributionLayoutChange={handleContributionLayoutChange}
            onContributionRegenerateMessage={
              handleContributionRegenerateMessage
            }
            contributionRegeneratingId={regeneratingContributionId}
            composePageBump={canPlaceNewGuestMessage ? 1 : 0}
            composeDraft={composeDraft}
            onComposeDraftChange={(patch) =>
              setComposeDraft((d) => (d ? { ...d, ...patch } : d))
            }
            onComposeCanvasPlace={
              canPlaceNewGuestMessage
                ? (pt) => {
                    setComposeDraft({
                      message: '',
                      x: pt.x,
                      y: pt.y,
                      pageIndex: pt.pageIndex,
                    })
                  }
                : undefined
            }
            onComposeSubmit={submitComposeDraft}
            onComposeCancel={cancelCompose}
            composeSubmitting={submitting}
            composeError={composeDraft ? error : null}
            onComposeDraftRegenerateMessage={handleComposeDraftRegenerate}
            composeDraftRegenerating={composeDraftRegenerating}
          />
        </div>
      </main>
    </div>
  )
}
