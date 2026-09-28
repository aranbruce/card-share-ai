import {
  Chat,
  Card,
  CardText,
  Divider,
  Actions,
  LinkButton,
  type AdapterPostableMessage,
} from "chat"
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
  deleteWorkspaceLinks,
} from "./internal-api"
import type { CardRow } from "@/lib/create-card"
import { cardPreviewImagePath } from "@/lib/card-preview"
import { SLACK_HELP_MESSAGE, type MessagesTabOpen } from "./slack-app-home"

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
  tone?: string,
  userContext?: string,
): Promise<CardRow | null> {
  const telemetryOptions = { distinctId: supabaseUserId }
  const headline = await generateHeadline(
    {
      cardType,
      recipientName,
      tone,
      userContext,
    },
    telemetryOptions,
  )
  const imageUrl = await generateImageUrl(
    {
      cardType,
      recipientName,
      coverHeadline: headline,
      tone,
      userContext,
    },
    telemetryOptions,
  )

  return createBotCard(supabaseUserId, {
    cardType,
    recipientName,
    senderName,
    copyHeadline: headline,
    imageUrl,
  })
}

function cardUrl(card: CardRow): string {
  const appUrl = getAppUrl()
  return `${appUrl}/dashboard/cards/${card.id}`
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

/**
 * The card's preview image (its front on a pastel backdrop, 1200×630), which Slack fetches
 * from the app. Falls back to the raw cover when the app isn't reachable over https.
 */
function cardImageUrl(card: CardRow): string | undefined {
  const appUrl = getAppUrl()
  const linkId = optionalText(card.contributor_link_id)
  if (linkId && appUrl.startsWith("https://")) {
    return `${appUrl}${cardPreviewImagePath(linkId, "view", {
      recipient_name: optionalText(card.recipient_name),
      sender_name: optionalText(card.sender_name),
      copy_headline: optionalText(card.copy_headline),
      image_url: optionalText(card.image_url),
    })}`
  }
  const cover = optionalText(card.image_url)
  return cover?.startsWith("https") ? cover : undefined
}

function contributorUrl(card: CardRow): string {
  const appUrl = getAppUrl()
  return `${appUrl}/contribute/${card.contributor_link_id}`
}

type BotAdapters = {
  slack: ReturnType<typeof createSlackAdapter>
}

let _slackAdapter: ReturnType<typeof createSlackAdapter> | null = null
let _bot: Chat<BotAdapters> | null = null
let _pgPool: pg.Pool | null = null

function createPgPool(): pg.Pool {
  const postgresUrl = process.env.POSTGRES_URL
  if (!postgresUrl) throw new Error("POSTGRES_URL is not configured")

  // pg's newer versions treat sslmode=require as verify-full, overriding our
  // ssl option, so we parse and strip sslmode before passing the URL to pg.
  // We also honour sslmode=disable explicitly rather than silently ignoring it.
  let connectionString = postgresUrl
  let sslMode: string | null = null
  try {
    const u = new URL(postgresUrl)
    sslMode = u.searchParams.get("sslmode")
    u.searchParams.delete("sslmode")
    connectionString = u.toString()
  } catch {
    // not a parseable URL, use as-is
  }

  if (sslMode === "disable") {
    return new pg.Pool({ connectionString, ssl: false })
  }

  // SECURITY: TLS certificate verification is enabled by default. Set
  // POSTGRES_SSL_REJECT_UNAUTHORIZED=false only when connecting through
  // Supabase's transaction pooler, which presents a certificate that Node.js
  // cannot verify natively. Do not disable in production without understanding
  // the MITM risk on the network path to the database.
  const rejectUnauthorized =
    process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== "false"
  return new pg.Pool({ connectionString, ssl: { rejectUnauthorized } })
}

// Extract the Slack workspace/team ID from a raw event payload.
// Slash command payloads carry team_id as a top-level string; modal/action
// payloads carry it under team.id. Falls back to "" for platforms with no team concept.
function getSlackTeamId(event: { raw: unknown }): string {
  const raw = event.raw as Record<string, unknown>
  if (typeof raw?.team_id === "string") return raw.team_id
  const team = raw?.team as Record<string, unknown> | undefined
  if (typeof team?.id === "string") return team.id
  return ""
}

export function getSlackAdapter(): ReturnType<typeof createSlackAdapter> {
  if (_slackAdapter) return _slackAdapter
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!clientId)
    throw new Error("NEXT_PUBLIC_SLACK_CLIENT_ID is not configured")
  if (!clientSecret) throw new Error("SLACK_CLIENT_SECRET is not configured")
  if (!signingSecret) throw new Error("SLACK_SIGNING_SECRET is not configured")
  _slackAdapter = createSlackAdapter({ clientId, clientSecret, signingSecret })
  return _slackAdapter
}

/**
 * Removes everything we hold for a Slack workspace once the app is uninstalled
 * or its bot token is revoked: the stored bot token and the account links.
 */
export async function removeSlackInstallation(
  installationId: string,
): Promise<void> {
  await getSlackAdapter().deleteInstallation(installationId)
  await deleteWorkspaceLinks("slack", installationId)
}

/**
 * Sends the welcome message the first time a user opens the app's Messages
 * tab. Slack requires listed apps that enable the Messages tab to do this.
 */
export async function sendMessagesTabWelcome({
  installationId,
  teamId,
  userId,
  channelId,
}: MessagesTabOpen): Promise<void> {
  const state = getBot().getState()
  const key = `slack:welcomed:${teamId}:${userId}`
  if (!(await state.setIfNotExists(key, true))) return

  try {
    const adapter = getSlackAdapter()
    const installation = await adapter.getInstallation(installationId)
    if (!installation) throw new Error("installation not found")
    await adapter.withBotToken(installation.botToken, () =>
      adapter.webClient.chat.postMessage({
        channel: channelId,
        text: SLACK_HELP_MESSAGE,
      }),
    )
  } catch (err) {
    // Clear the marker so the next open retries the welcome
    await state.delete(key)
    throw err
  }
}

export function getBot(): Chat<BotAdapters> {
  if (_bot) return _bot

  if (!_pgPool) _pgPool = createPgPool()
  _bot = new Chat<BotAdapters>({
    userName: "cardshareAI",
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
  // Reply to any direct message with instructions. Card creation happens via
  // the slash commands, so there is nothing else to do with DM content.
  bot.onDirectMessage(async (_thread, message, channel) => {
    if (message.author.isBot || message.author.isMe) return
    try {
      await channel.post(SLACK_HELP_MESSAGE)
    } catch (err) {
      console.error(`[cardshareai] DM reply FAIL:`, err)
    }
  })

  // /createcard slash command → open modal
  bot.onSlashCommand("/cardshareai", async (event: SlashCommandEvent) => {
    const platform = event.adapter.name
    const teamId = getSlackTeamId(event)
    try {
      const linked = await findLinkedUser(platform, event.user.userId, teamId)
      if (!linked) {
        const linkUrl = await createLinkUrl(platform, event.user.userId, teamId)
        const msg = `You need to connect your CardShare.ai account before creating a card:\n${linkUrl}\n\n_This link expires in 15 minutes._`
        try {
          await event.channel.postEphemeral(event.user, msg, {
            fallbackToDM: false,
          })
        } catch (ephemeralErr) {
          console.error(
            `[cardshareai] ephemeral FAIL: ${ephemeralErr instanceof Error ? ephemeralErr.message : String(ephemeralErr)}. Falling back to DM`,
          )
          const dm = await bot.openDM(event.user)
          await dm.post(msg)
        }
        return
      }
    } catch (err) {
      console.error(
        `[cardshareai] account check FAIL: ${err instanceof Error ? err.message : String(err)}`,
      )
      const errMsg =
        "Something went wrong checking your account. Please try again."
      try {
        await event.channel.postEphemeral(event.user, errMsg, {
          fallbackToDM: false,
        })
      } catch {
        try {
          const dm = await bot.openDM(event.user)
          await dm.post(errMsg)
        } catch {
          // nothing more we can do
        }
      }
      return
    }

    try {
      await event.openModal({
        type: "modal",
        callbackId: "create_card",
        title: "Create a Card",
        submitLabel: "Create",
        privateMetadata: event.channel.toJSON().id,
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
              "Any details to personalise the card? e.g. loves botanical illustration, just got promoted, turning 30",
            multiline: true,
            optional: true,
          },
        ],
      })
    } catch (err) {
      console.error(
        `[cardshareai] openModal FAIL: ${err instanceof Error ? err.message : String(err)}`,
      )
      try {
        await event.channel.postEphemeral(
          event.user,
          "Something went wrong opening the card creator. Please try again.",
          { fallbackToDM: false },
        )
      } catch {
        try {
          const dm = await bot.openDM(event.user)
          await dm.post(
            "Something went wrong opening the card creator. Please try again.",
          )
        } catch {
          // nothing more we can do
        }
      }
    }
  })

  // /link slash command
  bot.onSlashCommand("/cardshareai-link", async (event: SlashCommandEvent) => {
    const platform = event.adapter.name
    const userId = event.user.userId
    const teamId = getSlackTeamId(event)
    try {
      const existing = await findLinkedUser(platform, userId, teamId)
      const msg = existing
        ? "Your CardShare.ai account is already connected! Use `/cardshareai` to create a card."
        : `Connect your CardShare.ai account:\n${await createLinkUrl(platform, userId, teamId)}\n\n_This link expires in 15 minutes._`
      try {
        await event.channel.postEphemeral(event.user, msg, {
          fallbackToDM: false,
        })
      } catch {
        const dm = await bot.openDM(event.user)
        await dm.post(msg)
      }
    } catch (err) {
      console.error(
        `[cardshareai-link] FAIL: ${err instanceof Error ? err.message : String(err)}`,
      )
      try {
        await event.channel.postEphemeral(
          event.user,
          "Something went wrong generating your link. Please try again.",
          { fallbackToDM: false },
        )
      } catch {
        try {
          const dm = await bot.openDM(event.user)
          await dm.post(
            "Something went wrong generating your link. Please try again.",
          )
        } catch {
          // nothing more we can do
        }
      }
    }
  })

  // Modal submit handler
  bot.onModalSubmit("create_card", async (event: ModalSubmitEvent) => {
    const { values, user } = event
    const platform = event.adapter.name
    const teamId = getSlackTeamId(event)
    const channelId = event.privateMetadata || null

    const cardType = values.card_type || "custom"
    const recipientName = (values.recipient_name || "").trim()
    const senderName = (values.sender_name || "").trim()
    const tone = values.tone || "Warm"
    const userContext = (values.context || "").trim() || undefined

    if (!recipientName || !senderName) {
      return {
        action: "errors",
        errors: { recipient_name: "Required", sender_name: "Required" },
      }
    }

    let supabaseUserId: string | null
    try {
      supabaseUserId = await findLinkedUser(platform, user.userId, teamId)
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
        const linkUrl = await createLinkUrl(platform, user.userId, teamId)
        const dm = await bot.openDM(user)
        await dm.post(`Connect your CardShare.ai account first:\n${linkUrl}`)
      } catch (err) {
        console.error(`[modal/createLinkUrl] FAIL:`, err)
      }
      return { action: "close" }
    }

    const resolvedUserId = supabaseUserId

    // Use after() so card generation survives after Slack's response is sent
    after(async () => {
      async function notify(msg: AdapterPostableMessage) {
        if (channelId) {
          try {
            await bot
              .getAdapter("slack")
              .postEphemeral(channelId, user.userId, msg)
            return
          } catch {
            // fall through to DM
          }
        }
        try {
          await (await bot.openDM(user)).post(msg)
        } catch (err) {
          console.error(`[modal/notify] FAIL:`, err)
        }
      }

      await notify(`✨ Creating a card for *${recipientName}*…`)

      try {
        const card = await generateAndCreateCard(
          resolvedUserId,
          cardType,
          recipientName,
          senderName,
          tone,
          userContext,
        )
        if (!card) {
          await notify(
            "Sorry, I couldn't create the card. Please try again later.",
          )
          return
        }

        const imageUrl = cardImageUrl(card)

        await notify(
          Card({
            title: `Your card for ${recipientName} is ready!`,
            ...(imageUrl ? { imageUrl } : {}),
            children: [
              // The preview image already shows the title on the card.
              ...(card.copy_headline && !imageUrl
                ? [CardText(`"${card.copy_headline as string}"`), Divider()]
                : []),
              Actions([
                LinkButton({ label: "Open Card", url: cardUrl(card) }),
                LinkButton({
                  label: "Share Contributor Link",
                  url: contributorUrl(card),
                }),
              ]),
            ],
          }),
        )
      } catch (err) {
        console.error(`[modal/generate] FAIL:`, err)
        await notify(
          "Sorry, I couldn't create the card. Please try again later.",
        )
      }
    })

    return { action: "close" }
  })
}
