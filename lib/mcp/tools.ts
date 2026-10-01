import type { McpServer, ServerContext } from "@modelcontextprotocol/server"
import { validate as isValidUuid } from "uuid"
import { z } from "zod"
import { getAppUrl } from "@/lib/app-url"
import { CARD_TONES, DEFAULT_CARD_TONE } from "@/lib/card-tones"
import { createCardForUser } from "@/lib/create-card"
import { generateCardHeadline } from "@/lib/generate-card-headline"
import { generateCardCoverImage } from "@/lib/generate-card-image"
import { flushPostHogAiSpans } from "@/lib/posthog-ai-flush"
import { captureServerEvent } from "@/lib/posthog-server"
import { checkFixedWindowRateLimitForKey } from "@/lib/request-rate-limit"
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server"
import { createUserScopedClient, mcpUserId } from "@/lib/mcp/auth"
import { countSignatures, creatorNoteUpdate } from "@/lib/mcp/card-messages"
import { CARD_WIDGET_URI, registerCardWidget } from "@/lib/mcp/card-widget"
import {
  formatCardText,
  MCP_CARD_COLUMNS,
  summarizeCard,
  type McpCardRow,
  type McpCardSummary,
} from "@/lib/mcp/card-summary"

export const MCP_CARD_TYPES = [
  "birthday",
  "thank_you",
  "congratulations",
  "holiday",
  "sympathy",
  "custom",
] as const

const FALLBACK_HEADLINE = "Wishing you all the best!"

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

const NOT_SIGNED_IN =
  "You're not signed in to CardShare.ai. Reconnect the CardShare.ai connector and try again."

type McpUser = NonNullable<ReturnType<typeof requireUser>>

/**
 * One of the user's cards with its signature count, or an error message to
 * return. The count is left out when it can't be loaded, rather than shown as 0.
 */
async function loadCardSummary(
  user: McpUser,
  cardId: string,
  logTag: string,
): Promise<{ card: McpCardSummary } | { error: string }> {
  const { data, error } = await user.supabase
    .from("cards")
    .select(MCP_CARD_COLUMNS)
    .eq("id", cardId)
    .eq("user_id", user.userId)
    .maybeSingle()
  if (error) {
    console.error(`[mcp/${logTag}] FAIL:`, error)
    return { error: "Sorry, the card couldn't be loaded." }
  }
  if (!data) return { error: "No card with that id in your account." }

  const { data: rows, error: rowsError } = await user.supabase
    .from("card_contributions")
    .select("message, giphy_url")
    .eq("card_id", cardId)
  if (rowsError) {
    console.error(`[mcp/${logTag}] signatures FAIL:`, rowsError)
  }

  return {
    card: summarizeCard(
      getAppUrl(),
      data as McpCardRow,
      rowsError ? undefined : countSignatures(rows ?? []),
    ),
  }
}

function cardResult(card: McpCardSummary, note?: string) {
  const text = formatCardText(card)
  return {
    content: [
      { type: "text" as const, text: note ? `${note}\n\n${text}` : text },
    ],
    structuredContent: { card },
  }
}

// Shows the card(s) inline in hosts that support MCP Apps
const CARD_WIDGET_META = { ui: { resourceUri: CARD_WIDGET_URI } }

export function registerCardTools(server: McpServer): void {
  registerCardWidget(server)

  registerAppTool(
    server,
    "create_card",
    {
      title: "Create greeting card",
      description:
        "Creates a new CardShare.ai greeting card with an AI-written headline and AI-generated cover art, saved to the user's account. Returns links to edit the card, to invite a group to sign it, and to view it. Takes around 20–40 seconds. Ask for the recipient's name if you don't know it; use any details the user shares (hobbies, inside jokes, the occasion) as context.",
      inputSchema: z.object({
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
          .describe(
            "Who the card is from, e.g. 'Alex' or 'The design team'. Use the user's name if unsure.",
          ),
        cardType: z
          .enum(MCP_CARD_TYPES)
          .default("custom")
          .describe("The occasion"),
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
            "Details to personalise the headline and cover, e.g. 'loves botanical illustration, just got promoted, turning 30'",
          ),
      }),
      annotations: {
        title: "Create greeting card",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async ({ recipientName, senderName, cardType, tone, context }, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)

      // Keyed by user: every MCP call arrives from the client platform's IPs
      const rate = checkFixedWindowRateLimitForKey(user.userId, {
        namespace: "mcp:create-card",
        maxRequests: 10,
        windowMs: 10 * 60 * 1000,
      })
      if (!rate.allowed) {
        const minutes = Math.ceil(Number(rate.headers["Retry-After"]) / 60)
        return errorResult(
          `You've made a lot of cards in a short time. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        )
      }

      const telemetry = { distinctId: user.userId }
      const userContext = context || undefined
      let headline = FALLBACK_HEADLINE
      let imageUrl = ""
      try {
        try {
          headline = await generateCardHeadline(
            { cardType, recipientName, tone, userContext },
            telemetry,
          )
        } catch (err) {
          console.error("[mcp/create_card] headline FAIL:", err)
        }
        try {
          imageUrl = await generateCardCoverImage(
            {
              cardType,
              recipientName,
              coverHeadline: headline,
              tone,
              userContext,
            },
            telemetry,
          )
        } catch (err) {
          console.error("[mcp/create_card] image FAIL:", err)
        }
      } finally {
        await flushPostHogAiSpans()
      }

      const result = await createCardForUser(user.supabase, user.userId, {
        cardType,
        recipientName,
        senderName,
        copyHeadline: headline,
        imageUrl,
      })
      if ("error" in result) {
        console.error("[mcp/create_card] FAIL:", result.error)
        return errorResult(
          "Sorry, the card couldn't be saved. Please try again.",
        )
      }

      captureServerEvent(user.userId, "card_created", {
        card_id: result.card.id,
        card_type: cardType,
        source: "mcp",
        mcp_client_id: ctx.http?.authInfo?.clientId,
      })

      const card = summarizeCard(getAppUrl(), result.card as McpCardRow, 0)
      const notes = [
        imageUrl
          ? null
          : "The cover image couldn't be generated; the user can regenerate it from the edit link.",
        "Next: share the invite link with anyone who should sign the card, and open the edit link to add your own message.",
      ].filter(Boolean)

      return {
        content: [
          {
            type: "text" as const,
            text: `${formatCardText(card)}\n\n${notes.join("\n")}`,
          },
        ],
        structuredContent: { card },
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
        : "No cards yet. Use create_card to make one."

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
        "Gets one of the user's greeting cards by id, including how many people have signed it and the links to edit, share and view it.",
      inputSchema: z.object({
        cardId: z
          .string()
          .describe("The card id, from list_cards or create_card"),
      }),
      annotations: {
        title: "Get card details",
        readOnlyHint: true,
        openWorldHint: false,
      },
      _meta: CARD_WIDGET_META,
    },
    async ({ cardId }, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)
      if (!isValidUuid(cardId)) return errorResult("That card id isn't valid.")

      const result = await loadCardSummary(user, cardId, "get_card")
      if ("error" in result) return errorResult(result.error)
      return cardResult(result.card)
    },
  )

  registerAppTool(
    server,
    "update_card",
    {
      title: "Edit card",
      description:
        "Edits one of the user's cards: the headline on the front, the recipient or sender names, or the user's own message inside the card. Only pass the fields to change. To refine the headline, write the new wording yourself (keep it short, like the original) and confirm it with the user first. The user's message appears inside the card; if they haven't placed it yet, it goes in the middle of the message page and they can move it from the edit link.",
      inputSchema: z.object({
        cardId: z
          .string()
          .describe("The card id, from list_cards or create_card"),
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

      const result = await loadCardSummary(user, cardId, "update_card")
      if ("error" in result) return errorResult(result.error)
      return cardResult(result.card, "Card updated.")
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
