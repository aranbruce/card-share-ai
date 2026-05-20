"use client"

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useRef,
} from "react"
import type { Contribution } from "@/lib/card-body"
import type { OwnerCard } from "@/components/card-owner-studio"
import { useDebouncedSave } from "./use-debounced-save"
import { apiPatch, apiPost } from "@/lib/api-client"

type ContributionPatchArgs = {
  message?: string
  giphyUrl?: string | null
  positionX?: number
  positionY?: number
  widthPercent?: number
  pageIndex?: number
  fontSize?: number
  textColor?: string | null
  rotationDegrees?: number | null
}

export function useContributions({
  cardId,
  card,
  contributions,
  editingContributionId,
  setContributions,
  setCard,
}: {
  cardId: string
  card: OwnerCard | null
  contributions: Contribution[]
  editingContributionId: string | null
  setContributions: Dispatch<SetStateAction<Contribution[]>>
  setCard: Dispatch<SetStateAction<OwnerCard | null>>
}) {
  const scheduleMessageSave = useDebouncedSave(600)
  const scheduleLayoutSave = useDebouncedSave(200)
  const scheduleGifSave = useDebouncedSave(200)
  const saveGenerationRef = useRef(0)

  const creatorRow = useMemo(
    () => contributions.find((c) => Boolean(c.is_creator)),
    [contributions],
  )

  const saveContributionPatch = useCallback(
    async (
      contributionId: string,
      updates: ContributionPatchArgs,
      saveGeneration?: number,
    ) => {
      const generation = saveGeneration ?? ++saveGenerationRef.current
      try {
        const p = await apiPatch<{
          contributions?: Contribution[]
          extra_pages?: number
        }>(`/api/cards/${cardId}/contributions`, { contributionId, ...updates })
        if (generation !== saveGenerationRef.current) {
          return
        }
        if (Array.isArray(p.contributions)) {
          setContributions(p.contributions)
        }
        if (typeof p.extra_pages === "number") {
          setCard((prev) =>
            prev ? { ...prev, extra_pages: p.extra_pages } : prev,
          )
        }
      } catch (e) {
        console.error("Owner contribution save failed", e)
      }
    },
    [cardId, setContributions, setCard],
  )

  const handleContributionEdit = useCallback(
    (contributionId: string, value: string) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, message: value } : c,
        ),
      )
      if (!creatorRow || contributionId !== creatorRow.id) return
      const saveGeneration = ++saveGenerationRef.current
      scheduleMessageSave(() => {
        void saveContributionPatch(
          contributionId,
          { message: value },
          saveGeneration,
        )
      })
    },
    [creatorRow, scheduleMessageSave, saveContributionPatch, setContributions],
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
        textColor?: string | null
        rotationDegrees?: number | null
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
                text_color:
                  layout.textColor === undefined
                    ? c.text_color
                    : layout.textColor,
                rotation_degrees:
                  layout.rotationDegrees === undefined
                    ? c.rotation_degrees
                    : layout.rotationDegrees,
              }
            : c,
        ),
      )
      if (!creatorRow || contributionId !== creatorRow.id) return
      const saveGeneration = ++saveGenerationRef.current
      scheduleLayoutSave(() => {
        void saveContributionPatch(
          contributionId,
          {
            positionX: layout.x,
            positionY: layout.y,
            widthPercent: layout.widthPercent,
            pageIndex: layout.pageIndex,
            fontSize: layout.fontSize,
            ...(layout.textColor !== undefined && {
              textColor: layout.textColor,
            }),
            ...(layout.rotationDegrees !== undefined && {
              rotationDegrees: layout.rotationDegrees,
            }),
          },
          saveGeneration,
        )
      })
    },
    [creatorRow, scheduleLayoutSave, saveContributionPatch, setContributions],
  )

  const changeActiveContributionLayout = useCallback(
    (partial: {
      fontSize?: number
      textColor?: string | null
      rotationDegrees?: number | null
      pageIndex?: number
    }) => {
      if (!editingContributionId) return
      const contrib = contributions.find((c) => c.id === editingContributionId)
      if (!contrib) return
      const x = typeof contrib.position_x === "number" ? contrib.position_x : 24
      const y = typeof contrib.position_y === "number" ? contrib.position_y : 24
      const widthPercent =
        typeof contrib.width_percent === "number" ? contrib.width_percent : 75
      const pageIndex =
        partial.pageIndex ??
        (typeof contrib.page_index === "number" ? contrib.page_index : 1)
      handleContributionLayoutChange(editingContributionId, {
        x,
        y,
        widthPercent,
        pageIndex,
        ...(partial.fontSize !== undefined && { fontSize: partial.fontSize }),
        ...(partial.textColor !== undefined && {
          textColor: partial.textColor,
        }),
        ...(partial.rotationDegrees !== undefined && {
          rotationDegrees: partial.rotationDegrees,
        }),
      })
    },
    [editingContributionId, contributions, handleContributionLayoutChange],
  )

  const handleContributionGifChange = useCallback(
    (contributionId: string, giphyUrl: string | null) => {
      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, giphy_url: giphyUrl } : c,
        ),
      )
      if (!creatorRow || contributionId !== creatorRow.id) return
      const currentMessage = creatorRow.message
      const saveGeneration = ++saveGenerationRef.current
      scheduleGifSave(() => {
        void saveContributionPatch(
          contributionId,
          {
            giphyUrl,
            ...(currentMessage && { message: currentMessage }),
          },
          saveGeneration,
        )
      })
    },
    [creatorRow, scheduleGifSave, saveContributionPatch, setContributions],
  )

  const handleContributionRegenerateMessage = useCallback(
    async (contributionId: string, prompt: string) => {
      if (!card || !creatorRow || contributionId !== creatorRow.id) return
      const current =
        contributions.find((c) => c.id === contributionId)?.message ?? ""
      try {
        const { text } = await apiPost<{ text?: string }>(
          "/api/regenerate-text",
          {
            field: "contribution_message",
            cardType: card.card_type || "custom",
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            currentValue: current,
            userPrompt: prompt,
          },
        )
        const next = String(text ?? "").trim()
        setContributions((prev) =>
          prev.map((c) =>
            c.id === contributionId ? { ...c, message: next } : c,
          ),
        )
        const saveGeneration = ++saveGenerationRef.current
        await saveContributionPatch(contributionId, { message: next }, saveGeneration)
      } catch (e) {
        console.error(e)
      }
    },
    [card, creatorRow, contributions, saveContributionPatch, setContributions],
  )

  return {
    creatorRow,
    saveContributionPatch,
    handleContributionEdit,
    handleContributionLayoutChange,
    changeActiveContributionLayout,
    handleContributionGifChange,
    handleContributionRegenerateMessage,
  }
}
