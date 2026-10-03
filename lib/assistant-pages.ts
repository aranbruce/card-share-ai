/**
 * The "use CardShare.ai in an AI assistant" pages (/claude, /chatgpt): one layout
 * (`components/assistant-connector-page.tsx`), with each assistant's steps and wording here.
 */

export type AssistantId = "claude" | "chatgpt"

export type AssistantPage = {
  id: AssistantId
  /** Product name, e.g. "Claude". */
  name: string
  path: string
  metaTitle: string
  metaDescription: string
  lede: string
  /** Short line under the hero, e.g. availability. */
  note: string
  /** Where the setup starts in the assistant itself. */
  cta: { label: string; href: string }
  steps: { title: string; desc: string }[]
  /**
   * A Loom share link (https://www.loom.com/share/…) for a walkthrough video. Shown above
   * the animated demo once set.
   */
  loomUrl: string | null
  goodToKnow: string[]
  troubleshooting: { q: string; a: string }[]
}

export const CONNECTOR_URL = "https://www.cardshare.ai/mcp"

/** Things to ask, for either assistant. */
export const ASSISTANT_PROMPTS = [
  "Make a birthday card for Sarah from the design team. She loves rock climbing, so make it Epic",
  "Make Dan a farewell card. I have a photo of him on his boat I'd like on the cover",
  "Email Sarah's card to sarah@example.com on Friday at 9am",
  "Make the headline on Sarah's card punchier",
  "How many people have signed Sarah's card?",
  "Show me the cards I've made",
]

/** What the connector can do, for either assistant. `{name}` is the assistant. */
export const ASSISTANT_CAPABILITIES = [
  {
    title: "Create a card",
    desc: "Say who it's for, who it's from, the occasion and a few personal details, and pick a tone: Heartfelt, Roast, Dad jokes or Epic. {name} writes the headline and draws the cover in about 20 to 40 seconds.",
  },
  {
    title: "Put your own photo on the cover",
    desc: "Ask for a card with your photo, or press Use my photo on any card {name} shows you, then choose the photo in the picker in the chat. It's only used to draw the cover.",
  },
  {
    title: "Schedule when it's sent",
    desc: "Give the recipient's email and a date and time, and the card is emailed to them then. Everyone signing sees it as the time to sign by. Ask {name} to cancel it at any time.",
  },
  {
    title: "Edit and check on cards",
    desc: "Change the headline, the names or your own message, list your cards, or see how many people have signed one, with its links to edit, invite people and view it.",
  },
]

const SHARED_GOOD_TO_KNOW = [
  "Free to use, with no credit card needed",
  "Photos you choose are only used to draw the cover; we don't keep them",
  "Moving notes, adding GIFs and extra pages happen on the website, through the card's edit link",
]

const SHARED_TROUBLESHOOTING = [
  {
    q: "The photo picker says photo upload isn't available",
    a: "Ask for the card without a photo, then open the edit link on the website to add a reference photo there.",
  },
  {
    q: "A photo link has expired",
    a: "Photo links last 30 minutes. Ask to see the card again and use the new Use my photo button.",
  },
  {
    q: "You've made a lot of cards in a short time",
    a: "Card and cover generation is limited to 10 every 10 minutes per account. Wait a few minutes and try again.",
  },
]

export const ASSISTANT_PAGES: Record<AssistantId, AssistantPage> = {
  claude: {
    id: "claude",
    name: "Claude",
    path: "/claude",
    metaTitle: "Use CardShare.ai in Claude",
    metaDescription:
      "Connect CardShare.ai to Claude to create AI group greeting cards from a chat, put your own photo on the cover, schedule when they're sent and share the link for everyone to sign.",
    lede: "Ask Claude for a group greeting card and it writes the headline, draws the cover and shows the card in your chat, ready to share for everyone to sign",
    note: "Free · Works on every Claude plan · Set up in about a minute",
    cta: {
      label: "Open Claude connectors",
      href: "https://claude.ai/new#customize/connectors",
    },
    steps: [
      {
        title: "Add a custom connector",
        desc: "In Claude, open Customize → Connectors, click Add, then Add custom connector. Name it CardShare.ai and paste the connector URL below",
      },
      {
        title: "Sign in and allow access",
        desc: "Click Connect, sign in or create a free CardShare.ai account with Google, GitHub or email, then click Allow so Claude can make and edit cards in your account",
      },
      {
        title: "Ask Claude for a card",
        desc: "Say who it's for, the occasion and a few personal details. Claude makes the card and shows it in the chat",
      },
    ],
    loomUrl: null,
    goodToKnow: [
      ...SHARED_GOOD_TO_KNOW,
      "Claude only works with cards in the CardShare.ai account you connect",
      "Free Claude plans allow one custom connector. On Team and Enterprise plans, an owner adds it for the organisation first",
      "Disconnect at any time from Claude's Customize → Connectors",
    ],
    troubleshooting: [
      {
        q: "Claude says it can't reach CardShare.ai",
        a: "Its sign-in has expired. Open Customize → Connectors and reconnect CardShare.ai, or press Reconnect in the chat.",
      },
      {
        q: "Claude doesn't show the card, only links",
        a: "Some Claude apps don't show interactive views yet. The links do the same job: open the edit link to see and change the card.",
      },
      ...SHARED_TROUBLESHOOTING,
    ],
  },
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    path: "/chatgpt",
    metaTitle: "Use CardShare.ai in ChatGPT",
    metaDescription:
      "Connect CardShare.ai to ChatGPT to create AI group greeting cards from a chat, put your own photo on the cover, schedule when they're sent and share the link for everyone to sign.",
    lede: "Ask ChatGPT for a group greeting card and it writes the headline, draws the cover and shows the card in your chat, ready to share for everyone to sign",
    note: "Free · Coming soon to ChatGPT's plugin directory; add it yourself today",
    cta: {
      label: "Open ChatGPT plugins",
      href: "https://chatgpt.com/plugins",
    },
    steps: [
      {
        title: "Add a custom MCP server",
        desc: "In ChatGPT, open Plugins, click Add, then Create custom MCP server",
      },
      {
        title: "Fill in the details",
        desc: "Name it CardShare.ai, paste the connector URL below as the Server URL and choose OAuth for authentication. ChatGPT warns about servers it hasn't reviewed (CardShare.ai is in its review queue), so tick I understand and want to continue, then click Create as a plugin",
      },
      {
        title: "Sign in and allow access",
        desc: "Sign in or create a free CardShare.ai account with Google, GitHub or email, then click Allow so ChatGPT can make and edit cards in your account",
      },
      {
        title: "Ask ChatGPT for a card",
        desc: "In a chat, mention CardShare.ai (or type @ and pick it), then say who the card is for, the occasion and a few personal details",
      },
    ],
    loomUrl: null,
    goodToKnow: [
      ...SHARED_GOOD_TO_KNOW,
      "ChatGPT only works with cards in the CardShare.ai account you connect",
      "Once CardShare.ai is in ChatGPT's plugin directory, you'll be able to add it from there in one click",
      "Remove it at any time from ChatGPT's Plugins page",
    ],
    troubleshooting: [
      {
        q: "There's no Create custom MCP server option",
        a: "On Business, Enterprise and Edu workspaces, an admin may need to allow custom plugins. Use cardshare.ai directly in the meantime.",
      },
      {
        q: "ChatGPT doesn't know about scheduling, or other new features",
        a: "ChatGPT remembers a plugin's features from when you added it. Remove CardShare.ai from Plugins and add it again to pick up new ones.",
      },
      ...SHARED_TROUBLESHOOTING,
    ],
  },
}

/** A Loom share link as its embed URL, or null if it isn't one. */
export function loomEmbedUrl(shareUrl: string | null): string | null {
  if (!shareUrl) return null
  const match = /^https:\/\/(?:www\.)?loom\.com\/share\/([0-9a-f]{32})/.exec(
    shareUrl,
  )
  return match ? `https://www.loom.com/embed/${match[1]}` : null
}
