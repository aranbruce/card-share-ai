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
import { createUserScopedClient, mcpUserId } from "@/lib/mcp/auth"
import {
  formatCardText,
  MCP_CARD_COLUMNS,
  summarizeCard,
  type McpCardRow,
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

export function registerCardTools(server: McpServer): void {
  server.registerTool(
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

  server.registerTool(
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

  server.registerTool(
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
    },
    async ({ cardId }, ctx) => {
      const user = requireUser(ctx)
      if (!user) return errorResult(NOT_SIGNED_IN)
      if (!isValidUuid(cardId)) return errorResult("That card id isn't valid.")

      const { data, error } = await user.supabase
        .from("cards")
        .select(MCP_CARD_COLUMNS)
        .eq("id", cardId)
        .eq("user_id", user.userId)
        .maybeSingle()
      if (error) {
        console.error("[mcp/get_card] FAIL:", error)
        return errorResult("Sorry, the card couldn't be loaded.")
      }
      if (!data) return errorResult("No card with that id in your account.")

      // Messages from the group, not the creator's own (often empty) note
      const { count, error: countError } = await user.supabase
        .from("card_contributions")
        .select("id", { count: "exact", head: true })
        .eq("card_id", cardId)
        .eq("is_creator", false)
      if (countError) {
        console.error("[mcp/get_card] count FAIL:", countError)
      }

      // Leave the count out rather than report 0 when it couldn't be loaded
      const card = summarizeCard(
        getAppUrl(),
        data as McpCardRow,
        countError ? undefined : (count ?? 0),
      )
      return {
        content: [{ type: "text" as const, text: formatCardText(card) }],
        structuredContent: { card },
      }
    },
  )
}
