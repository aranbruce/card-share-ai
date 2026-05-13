import { Chat } from "chat"
import { createSlackAdapter } from "@chat-adapter/slack"
import { getAppUrl } from "@/lib/app-url"
import { createPostgresState } from "@chat-adapter/state-pg"
import type { ModalSubmitEvent, SlashCommandEvent } from "chat"
import { after } from "next/server"
import {
  findLinkedUser,
  createLinkUrl,
  generateHeadline,
  generateImageUrl,
  createBotCard,
} from "./internal-api"

const CARD_TYPES = [
  "birthday",
  "thank_you",
  "congratulations",
  "holiday",
  "sympathy",
  "custom",
]

const TONES = ["Warm", "Playful", "Dry", "Sincere", "Short"]

async function generateAndCreateCard(
  supabaseUserId: string,
  cardType: string,
  recipientName: string,
  senderName: string,
  customMessage?: string,
): Promise<Record<string, unknown> | null> {
  const headline = await generateHeadline({
    cardType,
    recipientName,
    senderName,
    customMessage,
  })
  const imageUrl = await generateImageUrl({
    cardType,
    coverHeadline: headline,
    customMessage,
  })

  return createBotCard(supabaseUserId, {
    cardType,
    recipientName,
    senderName,
    copyHeadline: headline,
    imageUrl,
  })
}

function cardUrl(card: Record<string, unknown>): string {
  const appUrl = getAppUrl()
  return `${appUrl}/dashboard/cards/${card.id}`
}

type BotAdapters = {
  slack: ReturnType<typeof createSlackAdapter>
}

let _slackAdapter: ReturnType<typeof createSlackAdapter> | null = null
let _bot: Chat<BotAdapters> | null = null

export function getSlackAdapter(): ReturnType<typeof createSlackAdapter> {
  if (_slackAdapter) return _slackAdapter
  _slackAdapter = createSlackAdapter({
    clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  })
  return _slackAdapter
}

export function getBot(): Chat<BotAdapters> {
  if (_bot) return _bot

  _bot = new Chat<BotAdapters>({
    userName: "CardsAI",
    adapters: {
      slack: getSlackAdapter(),
    },
    state: createPostgresState(),
    dedupeTtlMs: 600_000,
  })

  registerHandlers(_bot)
  return _bot
}

function registerHandlers(bot: Chat<BotAdapters>): void {
  // /createcard slash command → open modal
  bot.onSlashCommand("/cardsai", async (event: SlashCommandEvent) => {
    try {
      await event.openModal({
        type: "modal",
        callbackId: "create_card",
        title: "Create a Card",
        submitLabel: "Create",
        children: [
          {
            type: "select",
            id: "card_type",
            label: "Card type",
            placeholder: "Select a type",
            options: CARD_TYPES.map((t) => ({
              type: "select_option",
              value: t,
              label: t
                .replace("_", " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            })),
          },
          {
            type: "text_input",
            id: "recipient_name",
            label: "Recipient's name",
            placeholder: "e.g. Alice",
          },
          {
            type: "text_input",
            id: "sender_name",
            label: "Your name",
            placeholder: event.user.fullName || "Your name",
            initialValue: event.user.fullName || "",
          },
          {
            type: "select",
            id: "tone",
            label: "Tone",
            placeholder: "Select a tone",
            initialOption: "Warm",
            options: TONES.map((t) => ({
              type: "select_option",
              value: t,
              label: t,
            })),
          },
          {
            type: "text_input",
            id: "context",
            label: "Context",
            placeholder:
              "Any details to personalise the card? e.g. loves botanical illustration, just got promoted, turning 30.",
            multiline: true,
            optional: true,
          },
        ],
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cardsai] FAIL: ${msg}`)
    }
  })

  // /link slash command
  bot.onSlashCommand("/cardsai-link", async (event: SlashCommandEvent) => {
    const platform = event.adapter.name
    const userId = event.user.userId
    const dm = await bot.openDM(event.user)

    const existing = await findLinkedUser(platform, userId)
    if (existing) {
      await dm.post(
        "Your CardsAI account is already connected! Use `/cardsai` to create a card.",
      )
      return
    }

    const linkUrl = await createLinkUrl(platform, userId)
    await dm.post(
      `Connect your CardsAI account:\n${linkUrl}\n\n_This link expires in 15 minutes._`,
    )
  })

  // Modal submit handler
  bot.onModalSubmit("create_card", async (event: ModalSubmitEvent) => {
    const { values, user, relatedChannel } = event
    const platform = event.adapter.name

    const cardType = values.card_type || "custom"
    const recipientName = (values.recipient_name || "").trim()
    const senderName = (values.sender_name || "").trim()
    const tone = values.tone || "Warm"
    const context = (values.context || "").trim()
    const customMessage = context
      ? `Tone: ${tone}. ${context}`
      : `Tone: ${tone}.`

    if (!recipientName || !senderName) {
      return {
        action: "errors",
        errors: { recipient_name: "Required", sender_name: "Required" },
      }
    }

    const supabaseUserId = await findLinkedUser(platform, user.userId)
    if (!supabaseUserId) {
      const linkUrl = await createLinkUrl(platform, user.userId)
      const dm = await bot.openDM(user)
      await dm.post(`Connect your CardsAI account first:\n${linkUrl}`)
      return { action: "close" }
    }

    // Use after() so card generation survives after Slack's response is sent
    after(async () => {
      let placeholder
      try {
        placeholder = relatedChannel
          ? await relatedChannel.post(
              `✨ Creating a card for *${recipientName}*…`,
            )
          : await (
              await bot.openDM(user)
            ).post(`✨ Creating a card for *${recipientName}*…`)
      } catch {
        placeholder = await (
          await bot.openDM(user)
        ).post(`✨ Creating a card for *${recipientName}*…`)
      }

      try {
        const card = await generateAndCreateCard(
          supabaseUserId,
          cardType,
          recipientName,
          senderName,
          customMessage,
        )
        await placeholder.edit(
          card
            ? `<@${user.userId}> Your card for *${recipientName}* is ready!\n${cardUrl(card)}`
            : "Sorry, I couldn't create the card. Please try again later.",
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[modal/generate] FAIL: ${msg}`)
        await placeholder.edit(
          "Sorry, I couldn't create the card. Please try again later.",
        )
      }
    })

    return { action: "close" }
  })
}
