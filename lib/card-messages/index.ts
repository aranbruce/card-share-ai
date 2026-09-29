import { birthdayMessages } from "./birthday"
import { farewellMessages } from "./farewell"
import { getWellSoonMessages } from "./get-well-soon"
import { graduationMessages } from "./graduation"
import { holidayMessages } from "./holiday"
import { kudosMessages } from "./kudos"
import { newBabyMessages } from "./new-baby"
import { promotionMessages } from "./promotion"
import { retirementMessages } from "./retirement"
import { sympathyMessages } from "./sympathy"
import { thankYouMessages } from "./thank-you"
import { weddingMessages } from "./wedding"
import { workAnniversaryMessages } from "./work-anniversary"
import type { CardMessagesPage } from "./types"

export type { CardMessagesPage, MessageGroup } from "./types"

const PAGES: CardMessagesPage[] = [
  birthdayMessages,
  thankYouMessages,
  workAnniversaryMessages,
  farewellMessages,
  weddingMessages,
  promotionMessages,
  kudosMessages,
  retirementMessages,
  getWellSoonMessages,
  sympathyMessages,
  newBabyMessages,
  graduationMessages,
  holidayMessages,
]

export const CARD_MESSAGES: Record<string, CardMessagesPage> =
  Object.fromEntries(PAGES.map((page) => [page.slug, page]))

export const ALL_MESSAGE_SLUGS = Object.keys(CARD_MESSAGES)

export function getCardMessages(slug: string): CardMessagesPage | undefined {
  return CARD_MESSAGES[slug]
}

export function countMessages(page: CardMessagesPage): number {
  return page.groups.reduce((n, group) => n + group.messages.length, 0)
}
