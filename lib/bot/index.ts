import { Chat } from "chat"
import { createSlackAdapter } from "@chat-adapter/slack"
import { getAppUrl } from "@/lib/app-url"
import { createPostgresState } from "@chat-adapter/state-pg"
import pg from "pg"
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

// Supabase's transaction pooler uses a certificate that Node.js can't verify
// natively. Newer pg versions treat sslmode=require as verify-full (rejectUnauthorized:
// true), overriding our ssl option — so strip sslmode from the URL first.
function stripSslMode(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete("sslmode")
    return u.toString()
  } catch {
    return url
  }
}

const _pgPool = new pg.Pool({
  connectionString: stripSslMode(process.env.POSTGRES_URL ?? ""),
  ssl: { rejectUnauthorized: false },
})

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
    state: createPostgresState({ client: _pgPool }),
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
      console.error(`[cardsai] openModal FAIL:`, err)
      try {
        const dm = await bot.openDM(event.user)
        await dm.post(
          "Something went wrong opening the card creator. Please try again.",
        )
      } catch {
        // DM also failed — nothing more we can do
      }
    }
  })

  // /link slash command
  bot.onSlashCommand("/cardsai-link", async (event: SlashCommandEvent) => {
    const platform = event.adapter.name
    const userId = event.user.userId
    try {
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
    } catch (err) {
      console.error(`[cardsai-link] FAIL:`, err)
      try {
        const dm = await bot.openDM(event.user)
        await dm.post(
          "Something went wrong generating your link. Please try again.",
        )
      } catch {
        // DM also failed — nothing more we can do
      }
    }
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

    let supabaseUserId: string | null
    try {
      supabaseUserId = await findLinkedUser(platform, user.userId)
    } catch (err) {
      console.error(`[modal/findLinkedUser] FAIL:`, err)
      return {
        action: "errors",
        errors: {
          recipient_name: "Something went wrong. Please try again in a moment.",
        } as Record<string, string>,
      }
    }

    if (!supabaseUserId) {
      try {
        const linkUrl = await createLinkUrl(platform, user.userId)
        const dm = await bot.openDM(user)
        await dm.post(`Connect your CardsAI account first:\n${linkUrl}`)
      } catch (err) {
        console.error(`[modal/createLinkUrl] FAIL:`, err)
      }
      return { action: "close" }
    }

    const resolvedUserId = supabaseUserId

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
        try {
          placeholder = await (
            await bot.openDM(user)
          ).post(`✨ Creating a card for *${recipientName}*…`)
        } catch (err) {
          console.error(
            `[modal/placeholder] FAIL: could not post to Slack`,
            err,
          )
          return
        }
      }

      try {
        const card = await generateAndCreateCard(
          resolvedUserId,
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
        console.error(`[modal/generate] FAIL:`, err)
        try {
          await placeholder.edit(
            "Sorry, I couldn't create the card. Please try again later.",
          )
        } catch {
          // Editing the placeholder also failed — nothing more we can do
        }
      }
    })

    return { action: "close" }
  })
}
