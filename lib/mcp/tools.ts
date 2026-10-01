import { randomUUID } from "node:crypto"
import type { McpServer, ServerContext } from "@modelcontextprotocol/server"
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { validate as isValidUuid } from "uuid"
import { z } from "zod"
import { getAppUrl } from "@/lib/app-url"
import { CARD_TONES, DEFAULT_CARD_TONE } from "@/lib/card-tones"
import { captureServerEvent } from "@/lib/posthog-server"
import { createUserScopedClient, mcpUserId } from "@/lib/mcp/auth"
import { creatorNoteUpdate } from "@/lib/mcp/card-messages"
import {
  cardGenerationLimitError,
  generateAndSaveCard,
  loadCardSummary,
} from "@/lib/mcp/card-ops"
import {
  formatCardText,
  MCP_CARD_COLUMNS,
  summarizeCard,
  type McpCardRow,
  type McpCardSummary,
} from "@/lib/mcp/card-summary"
import { CARD_WIDGET_URI, registerCardWidget } from "@/lib/mcp/card-widget"
import {
  photoUploadFor,
  photoUploadsEnabled,
  type PhotoTokenPayload,
} from "@/lib/mcp/photo-token"

export const MCP_CARD_TYPES = [
  "birthday",
  "thank_you",
  "congratulations",
  "holiday",
  "sympathy",
  "custom",
] as const

/** Result `_meta` key the card view reads its photo upload details from. */
export const PHOTO_UPLOAD_META_KEY = "cardshare/photoUpload"

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

/** The signed-in user and an RLS-scoped Supabase client for this tool call. */
function requireUser(ctx: ServerContext) {
  const authInfo = ctx.http?.authInfo
  const userId = mcpUserId(authInfo)
  if (!authInfo || !userId) return null
  return { userId, supabase: createUserScopedClient(authInfo.token) }
}

type McpUser = NonNullable<ReturnType<typeof requireUser>>

const NOT_SIGNED_IN =
  "You're not signed in to CardShare.ai. Reconnect the CardShare.ai connector and try again."

/**
 * Lets the card view upload a photo without the model ever seeing the
 * credential: `_meta` goes to the view, not into the model's context.
 */
function photoUploadMeta(payload: PhotoTokenPayload) {
  const upload = photoUploadFor(payload)
  return upload ? { [PHOTO_UPLOAD_META_KEY]: upload } : {}
}

function cardResult(user: McpUser, card: McpCardSummary, note?: string) {
  const text = formatCardText(card)
  return {
    content: [
      { type: "text" as const, text: note ? `${note}\n\n${text}` : text },
    ],
    structuredContent: { card },
    _meta: photoUploadMeta({
      purpose: "card-photo",
      userId: user.userId,
      cardId: card.id,
    }),
  }
}

// Shows the card(s) inline in hosts that support MCP Apps
const CARD_WIDGET_META = { ui: { resourceUri: CARD_WIDGET_URI } }

const newCardInputSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("Who the card is for, e.g. 'Sarah'"),
  senderName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("Who the card is from, e.g. 'Alex' or 'The design team'"),
  cardType: z.enum(MCP_CARD_TYPES).default("custom").describe("The occasion"),
  tone: z
    .enum(CARD_TONES)
    .default(DEFAULT_CARD_TONE)
    .describe(
      "Heartfelt: warm and sincere. Roast: affectionate teasing. Dad jokes: one groan-worthy pun. Hype: sports-commentator energy. Epic: movie-trailer drama. Sympathy cards always stay gentle.",
    ),
  context: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .describe(
      "Details that personalise the headline and cover, e.g. 'loves botanical illustration, just got promoted, turning 30'",
    ),
})

export function registerCardTools(server: McpServer): void {
  registerCardWidget(server)

  registerAppTool(
    server,
    "create_card",
    {
      title: "Create greeting card",
      description:
        "Creates a new greeting card in the user's CardShare.ai account, with an AI-written headline and AI-generated cover art based on the recipient, occasion, tone and personal details. Returns the card with links to edit it, to invite a group to sign it, and to view it. Takes around 20–40 seconds.",
      inputSchema: newCardInputSchema,
      annotations: {
        title: "Create greeting card",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async (inputs, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)
      const limited = cardGenerationLimitError(user.userId)
      if (limited) return errorResult(limited)

      const result = await generateAndSaveCard(
        user.supabase,
        user.userId,
        inputs,
      )
      if ("error" in result) return errorResult(result.error)

      captureServerEvent(user.userId, "card_created", {
        card_id: result.card.id,
        card_type: inputs.cardType,
        source: "mcp",
        mcp_client_id: ctx.http?.authInfo?.clientId,
      })

      const card = summarizeCard(getAppUrl(), result.card, 0)
      const notes = [
        result.coverFailed
          ? "The cover image couldn't be generated; the user can regenerate it from the edit link."
          : null,
        "Next: share the invite link with anyone who should sign the card, and open the edit link to add your own message.",
      ].filter(Boolean)
      return cardResult(user, card, notes.join("\n"))
    },
  )

  registerAppTool(
    server,
    "create_card_from_photo",
    {
      title: "Create card from a photo",
      description:
        "Starts a new greeting card whose cover is drawn from a photo of the user's. Shows a photo picker in the chat; the card, with its headline and cover, is created in the user's account once they choose a photo there. Photos attached to the chat itself aren't available to this tool.",
      inputSchema: newCardInputSchema,
      annotations: {
        title: "Create card from a photo",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async (inputs, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)
      if (!photoUploadsEnabled()) {
        return errorResult(
          "Photo covers aren't available right now. Cards can still be created without a photo.",
        )
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `A photo picker is now showing in the chat. The card for ${inputs.recipientName} is created when the user chooses a photo there, and its details are added to the conversation then.`,
          },
        ],
        structuredContent: {
          pendingPhoto: { recipientName: inputs.recipientName },
        },
        _meta: photoUploadMeta({
          purpose: "new-card-photo",
          userId: user.userId,
          nonce: randomUUID(),
          card: {
            recipientName: inputs.recipientName,
            senderName: inputs.senderName,
            cardType: inputs.cardType,
            tone: inputs.tone,
            context: inputs.context,
          },
        }),
      }
    },
  )

  registerAppTool(
    server,
    "list_cards",
    {
      title: "List my cards",
      description:
        "Lists the greeting cards in the user's CardShare.ai account, newest first, with their status and links.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("How many cards to return"),
      }),
      annotations: {
        title: "List my cards",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async ({ limit }, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)

      const { data, error } = await user.supabase
        .from("cards")
        .select(MCP_CARD_COLUMNS)
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) {
        console.error("[mcp/list_cards] FAIL:", error)
        return errorResult("Sorry, your cards couldn't be loaded.")
      }

      const appUrl = getAppUrl()
      const cards = (data ?? []).map((row) =>
        summarizeCard(appUrl, row as McpCardRow),
      )
      const text = cards.length
        ? cards
            .map(
              (card, i) => `${i + 1}. [id ${card.id}]\n${formatCardText(card)}`,
            )
            .join("\n\n")
        : "No cards yet."

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { cards },
      }
    },
  )

  registerAppTool(
    server,
    "get_card",
    {
      title: "Get card details",
      description:
        "Gets one of the user's greeting cards by id: its headline, names, the user's own message, how many people have signed it, and links to edit it, invite people to sign it and view it. The card shown in the chat has a button for the user to add or change the cover photo.",
      inputSchema: z.object({
        cardId: z.string().describe("The card's id"),
      }),
      annotations: {
        title: "Get card details",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async ({ cardId }, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)
      if (!isValidUuid(cardId)) return errorResult("That card id isn't valid.")

      const result = await loadCardSummary(user.supabase, user.userId, cardId)
      if ("error" in result) return errorResult(result.error)
      return cardResult(user, result.card)
    },
  )

  registerAppTool(
    server,
    "update_card",
    {
      title: "Edit card",
      description:
        "Edits one of the user's cards: the headline on the front, the recipient or sender names, or the user's own message inside the card. Fields that aren't passed stay as they are. The user's message appears inside the card; if they haven't placed it yet, it goes in the middle of the message page, and they can move it from the edit link.",
      inputSchema: z.object({
        cardId: z.string().describe("The card's id"),
        headline: z
          .string()
          .trim()
          .min(1)
          .max(140)
          .optional()
          .describe("New headline for the front of the card"),
        recipientName: z.string().trim().min(1).max(100).optional(),
        senderName: z.string().trim().min(1).max(100).optional(),
        myMessage: z
          .string()
          .trim()
          .max(2000)
          .optional()
          .describe(
            "The user's own message inside the card, replacing any they've written. An empty string removes it.",
          ),
      }),
      annotations: {
        title: "Edit card",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async ({ cardId, headline, recipientName, senderName, myMessage }, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)
      if (!isValidUuid(cardId)) return errorResult("That card id isn't valid.")

      const cardUpdates: Record<string, string> = {}
      if (headline !== undefined) cardUpdates.copy_headline = headline
      if (recipientName !== undefined)
        cardUpdates.recipient_name = recipientName
      if (senderName !== undefined) cardUpdates.sender_name = senderName
      // cards.copy_message mirrors the author's note, as in the web studio
      if (myMessage !== undefined) cardUpdates.copy_message = myMessage
      if (Object.keys(cardUpdates).length === 0) {
        return errorResult("Nothing to change: pass at least one field.")
      }

      const { data: updated, error } = await user.supabase
        .from("cards")
        .update({ ...cardUpdates, updated_at: new Date().toISOString() })
        .eq("id", cardId)
        .eq("user_id", user.userId)
        .select("id")
      if (error) {
        console.error("[mcp/update_card] FAIL:", error)
        return errorResult("Sorry, the card couldn't be updated.")
      }
      if (!updated?.length) {
        return errorResult("No card with that id in your account.")
      }

      if (myMessage !== undefined) {
        const saved = await saveCreatorNote(user, cardId, myMessage)
        if (!saved) {
          return errorResult(
            "The card was updated, but your message couldn't be saved. Please try again.",
          )
        }
      }

      captureServerEvent(user.userId, "card_updated", {
        card_id: cardId,
        fields: Object.keys(cardUpdates),
        source: "mcp",
        mcp_client_id: ctx.http?.authInfo?.clientId,
      })

      const result = await loadCardSummary(user.supabase, user.userId, cardId)
      if ("error" in result) return errorResult(result.error)
      return cardResult(user, result.card, "Card updated.")
    },
  )
}

/** Writes the author's note, placing it on the message page if it has no position yet. Returns whether it saved. */
async function saveCreatorNote(
  user: McpUser,
  cardId: string,
  message: string,
): Promise<boolean> {
  const { data: existing, error: readError } = await user.supabase
    .from("card_contributions")
    .select("id, position_x, position_y")
    .eq("card_id", cardId)
    .eq("is_creator", true)
    .maybeSingle()
  if (readError) {
    console.error("[mcp/update_card] read note FAIL:", readError)
    return false
  }

  const update = creatorNoteUpdate(existing, message || null)
  const { error } = existing
    ? await user.supabase
        .from("card_contributions")
        .update(update)
        .eq("id", existing.id)
    : // Cards from before author notes were pre-created have no row yet
      await user.supabase.from("card_contributions").insert({
        card_id: cardId,
        is_creator: true,
        font_size: 16,
        rotation_degrees: 0,
        ...update,
      })
  if (error) {
    console.error("[mcp/update_card] save note FAIL:", error)
    return false
  }
  return true
}
