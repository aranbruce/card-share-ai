/**
 * "CardShare.ai vs X" pages. Competitor details come only from each product's own
 * pricing and help pages; re-check them (and bump `checkedOn`) before changing copy.
 */

/** How a row is marked in the table. Leave it out for rows that just describe. */
export type CompareMark = "yes" | "partly" | "no"

export interface CompareRow {
  feature: string
  us: string
  usMark?: CompareMark
  them: string
  themMark?: CompareMark
}

export interface CompareGroup {
  name: string
  rows: CompareRow[]
}

export interface CompareConfig {
  slug: string
  /** ISO date for the sitemap; bump when the page's content changes meaningfully. */
  lastModified: string
  competitor: string
  /** When the competitor details were last checked against their own site. */
  checkedOn: string
  sources: { label: string; url: string }[]

  metaTitle: string
  metaDescription: string

  h1: string
  lede: string

  /**
   * The head-to-head panel in the hero: the biggest difference, shown large
   * under each product, with a short line beneath.
   */
  headToHead: {
    us: string
    usNote: string
    them: string
    themNote: string
    /** What sits in the competitor's placeholder, e.g. "their board". */
    themShot: string
  }

  /** Table groups, in order. Leave a group out rather than leave it empty. */
  groups: CompareGroup[]

  /** A short, even-handed bottom line: who each product suits. */
  verdict: string
  /** When CardShare.ai is the better choice. */
  pickUs: string[]
  /** Honest reasons someone might still pick the competitor. */
  pickThem: string[]

  faqs: { q: string; a: string }[]
}

const NOT_LISTED = "Not listed on their site"

const SLACK_FAQ = {
  q: "Does CardShare.ai work in Slack?",
  a: "Yes. The CardShare.ai Slack app lets you create a card with a slash command and share the signing link in any channel.",
}

export const COMPARE_CONFIGS: Record<string, CompareConfig> = {
  kudoboard: {
    slug: "kudoboard",
    lastModified: "2026-10-02",
    competitor: "Kudoboard",
    checkedOn: "September 2026",
    sources: [
      { label: "Kudoboard pricing", url: "https://www.kudoboard.com/pricing" },
      {
        label: "Kudoboard Lite board",
        url: "https://www.kudoboard.com/product-tour/lite-board/",
      },
    ],

    metaTitle: "CardShare.ai vs Kudoboard: A Free Alternative",
    metaDescription:
      "Comparing CardShare.ai and Kudoboard for group cards. CardShare.ai is free to send, designs the cover with AI, and works in Slack without a subscription.",

    h1: "CardShare.ai vs Kudoboard",
    lede: "Both let a whole group sign one card from a single link. The difference is price and what the AI does: CardShare.ai designs the cover and drafts the opening note, and sending a card is free",

    headToHead: {
      us: "Free",
      usNote: "AI-designed cover, opens like a card",
      them: "$6.99",
      themNote: "per board, or from $25/month",
      themShot: "their board",
    },

    groups: [
      {
        name: "Price",
        rows: [
          {
            feature: "Price to send a card",
            us: "Free",
            usMark: "yes",
            them: "One-time boards from $6.99; subscriptions from $25/month billed annually",
          },
        ],
      },
      {
        name: "Design and writing",
        rows: [
          {
            feature: "AI-designed cover image",
            us: "Yes, from one sentence or your photo",
            usMark: "yes",
            them: NOT_LISTED,
            themMark: "no",
          },
          {
            feature: "AI message help",
            us: "Drafts the headline and opening note",
            usMark: "yes",
            them: "Rewrites messages in styles like a haiku",
            themMark: "partly",
          },
        ],
      },
      {
        name: "Signing",
        rows: [
          {
            feature: "No account to sign",
            us: "No account needed",
            usMark: "yes",
            them: "Not needed on most boards",
            themMark: "partly",
          },
          {
            feature: "Signers per card",
            us: "No limit",
            usMark: "yes",
            them: "Depends on the board; Lite boards take up to 20 posts",
            themMark: "partly",
          },
          {
            feature: "GIFs in messages",
            us: "Yes",
            usMark: "yes",
            them: "Yes",
            themMark: "yes",
          },
        ],
      },
      {
        name: "Sending",
        rows: [
          {
            feature: "Slack",
            us: "Slack app included",
            usMark: "yes",
            them: "Slack and Microsoft Teams on the Pro plan and above",
            themMark: "partly",
          },
          {
            feature: "Card format",
            us: "A 3D greeting card that opens in the browser",
            them: "A digital board, with printed books and posters available",
          },
        ],
      },
    ],

    pickThem: [
      "You want a printed book or poster of the board",
      "You need Microsoft Teams, HR system integrations or SSO",
      "You want automated birthday and anniversary boards across a large company",
    ],
    verdict:
      "If you want a free group card with a cover designed for the person, especially for a team that lives in Slack, CardShare.ai does the job without a subscription. If you need printed keepsakes, Microsoft Teams, HR integrations or automated boards across a large company, Kudoboard's paid plans cover more ground.",
    pickUs: [
      "You want to send a group card without paying for it",
      "You'd rather not design the cover yourself: the AI does it from one sentence",
      "You want something that looks and opens like a real greeting card",
      "Your team lives in Slack and you don't want another subscription",
    ],

    faqs: [
      {
        q: "Is there a free alternative to Kudoboard?",
        a: "Yes. CardShare.ai lets you design a group card, collect signatures from one link, and send it for free. Signers don't need an account.",
      },
      {
        q: "How much does Kudoboard cost?",
        a: "As of September 2026, one-time Kudoboard boards start at $6.99, and subscriptions start at $25/month billed annually. CardShare.ai is free to send.",
      },
      {
        q: "What's the main difference between CardShare.ai and Kudoboard?",
        a: "Kudoboard is a paid digital board where posts are laid out on a page. CardShare.ai makes a greeting card with an AI-designed cover and an opening note, which the group signs and the recipient opens like a real card. Sending one is free.",
      },
      SLACK_FAQ,
      {
        q: "Can I switch from Kudoboard to CardShare.ai?",
        a: "Yes. There's nothing to migrate: start your next card on CardShare.ai and share the link the same way you would a board.",
      },
    ],
  },

  groupgreeting: {
    slug: "groupgreeting",
    lastModified: "2026-10-02",
    competitor: "GroupGreeting",
    checkedOn: "September 2026",
    sources: [
      {
        label: "GroupGreeting pricing help article",
        url: "https://groupgreeting.freshdesk.com/support/solutions/articles/63000100351",
      },
      {
        label: "GroupGreeting signing and delivery help article",
        url: "https://groupgreeting.freshdesk.com/support/solutions/articles/63000086498",
      },
    ],

    metaTitle: "CardShare.ai vs GroupGreeting: A Free Alternative",
    metaDescription:
      "Comparing CardShare.ai and GroupGreeting for group ecards. CardShare.ai is free to send, designs a custom cover with AI, and includes a Slack app.",

    h1: "CardShare.ai vs GroupGreeting",
    lede: "Both let everyone sign one card from a single link, with no account needed to sign. CardShare.ai is free to send, and its AI designs a cover and drafts an opening note made for the person you're celebrating",

    headToHead: {
      us: "Free",
      usNote: "AI-designed cover, opens like a card",
      them: "$5.99",
      themNote: "per card, multi-page ecard",
      themShot: "their ecard",
    },

    groups: [
      {
        name: "Price",
        rows: [
          {
            feature: "Price to send a card",
            us: "Free",
            usMark: "yes",
            them: "$5.99 per card, or prepaid card bundles at 10% to 33% off",
          },
        ],
      },
      {
        name: "Design and writing",
        rows: [
          {
            feature: "AI-designed cover image",
            us: "Yes, from one sentence or your photo",
            usMark: "yes",
            them: NOT_LISTED,
            themMark: "no",
          },
          {
            feature: "AI message help",
            us: "Drafts the headline and opening note",
            usMark: "yes",
            them: NOT_LISTED,
            themMark: "no",
          },
        ],
      },
      {
        name: "Signing",
        rows: [
          {
            feature: "No account to sign",
            us: "No account needed",
            usMark: "yes",
            them: "No account needed",
            themMark: "yes",
          },
          {
            feature: "Signers per card",
            us: "No limit",
            usMark: "yes",
            them: "No limit",
            themMark: "yes",
          },
        ],
      },
      {
        name: "Sending",
        rows: [
          {
            feature: "Slack",
            us: "Slack app included",
            usMark: "yes",
            them: "Share the signing link in Slack",
            themMark: "partly",
          },
          {
            feature: "Scheduled delivery",
            us: "Send when you're ready",
            usMark: "no",
            them: "Yes, at a date and time you pick",
            themMark: "yes",
          },
          {
            feature: "Card format",
            us: "A 3D greeting card that opens in the browser",
            them: "A multi-page ecard, with a PDF copy",
          },
        ],
      },
    ],

    pickThem: [
      "You want the card delivered automatically at a set date and time",
      "You want a PDF copy of the finished card",
    ],
    verdict:
      "Both handle the basics well: one link, no account to sign and no limit on signers. CardShare.ai is free and designs a cover for each person. GroupGreeting is the better pick if you need a card delivered automatically on a set date, or a PDF copy to keep.",
    pickUs: [
      "You want to send a group card without paying per card",
      "You want a cover designed for this person and occasion",
      "You want help writing the opening note",
      "Your team lives in Slack and you'd like to start cards from there",
    ],

    faqs: [
      {
        q: "Is there a free alternative to GroupGreeting?",
        a: "Yes. CardShare.ai lets you design a group card, collect signatures from one link, and send it for free. Signers don't need an account.",
      },
      {
        q: "How much does GroupGreeting cost?",
        a: "As of September 2026, GroupGreeting charges $5.99 per card, with prepaid card bundles at 10% to 33% off. CardShare.ai is free to send.",
      },
      {
        q: "What's the main difference between CardShare.ai and GroupGreeting?",
        a: "GroupGreeting charges per card. CardShare.ai is free to send, and its AI designs a cover and drafts an opening note for the specific person and occasion.",
      },
      SLACK_FAQ,
      {
        q: "Can signers add GIFs?",
        a: "Yes. Everyone who signs a CardShare.ai card can add a GIF alongside their message.",
      },
    ],
  },

  padlet: {
    slug: "padlet",
    lastModified: "2026-10-02",
    competitor: "Padlet",
    checkedOn: "September 2026",
    sources: [
      { label: "Padlet pricing", url: "https://padlet.com/premium" },
      {
        label: "Padlet help on anonymous posts",
        url: "https://padlet.help/l/en/article/pxz0gx55l9-create-anonymous-posts",
      },
      {
        label: "Padlet help on AI images",
        url: "https://padlet.help/l/en/article/hssem15azs-i-can-t-draw-ai-image-generation",
      },
    ],

    metaTitle: "CardShare.ai vs Padlet for Group Cards",
    metaDescription:
      "Using Padlet for a group card? CardShare.ai is built for it: an AI-designed card everyone signs from one link, free to send, with a Slack app.",

    h1: "CardShare.ai vs Padlet for group cards",
    lede: "Padlet is a flexible board for all kinds of collaboration, and plenty of teams use it for group cards. CardShare.ai is made just for cards: the AI designs a cover, everyone signs from one link, and the recipient opens a real greeting card",

    headToHead: {
      us: "A card",
      usNote: "made for group cards, free to send",
      them: "A board",
      themNote: "3 free padlets, then from $15/month",
      themShot: "their board",
    },

    groups: [
      {
        name: "Basics",
        rows: [
          {
            feature: "Made for",
            us: "Group greeting cards",
            them: "Collaborative boards for any purpose",
          },
          {
            feature: "Price",
            us: "Free to design, sign and send",
            usMark: "yes",
            them: "Free plan with up to 3 padlets; Platinum from $15/month",
            themMark: "partly",
          },
        ],
      },
      {
        name: "Design and writing",
        rows: [
          {
            feature: "AI",
            us: "Designs the card cover and drafts the opening note",
            usMark: "yes",
            them: "Generates images inside posts, and can draft a whole board",
            themMark: "yes",
          },
        ],
      },
      {
        name: "Signing",
        rows: [
          {
            feature: "No account to post",
            us: "No account needed",
            usMark: "yes",
            them: "Guests can post unless the owner requires login",
            themMark: "yes",
          },
        ],
      },
      {
        name: "Sending",
        rows: [
          {
            feature: "Slack",
            us: "Slack app included",
            usMark: "yes",
            them: NOT_LISTED,
            themMark: "no",
          },
          {
            feature: "What the recipient gets",
            us: "A 3D greeting card with every message inside, sent by email or link",
            them: "A link to the board",
          },
        ],
      },
    ],

    pickThem: [
      "You want one tool for brainstorming, classrooms and cards",
      "You want contributors to post videos, audio or files",
      "Your school already uses Padlet with Microsoft Teams",
    ],
    verdict:
      "Padlet is a flexible board for all sorts of collaboration, and it works for a group card in a pinch. If what you're making is a card, CardShare.ai is built for it: a real greeting card with an AI-designed cover, free to send, with a Slack app. If you'll also use the board for classes, brainstorms or posts with video and audio, Padlet does more.",
    pickUs: [
      "You want it to feel like a real greeting card, not a board",
      "You'd like the cover designed for you from one sentence",
      "You send cards often and don't want to hit a free-plan limit",
      "Your team lives in Slack",
    ],

    faqs: [
      {
        q: "Can you use Padlet for a group card?",
        a: "Yes, many teams do: you create a board and share the link. CardShare.ai is built specifically for group cards, so the result looks and opens like a greeting card, and the AI designs the cover for you.",
      },
      {
        q: "How much does Padlet cost?",
        a: "As of September 2026, Padlet's free plan includes up to 3 padlets, and Platinum starts at $15/month. CardShare.ai is free to design, sign and send.",
      },
      {
        q: "Is there a free Padlet alternative for group cards?",
        a: "Yes. CardShare.ai lets you design a group card, collect signatures from one link, and send it for free. Signers don't need an account.",
      },
      SLACK_FAQ,
    ],
  },

  sendwishonline: {
    slug: "sendwishonline",
    lastModified: "2026-10-02",
    competitor: "SendWishOnline",
    checkedOn: "September 2026",
    sources: [
      { label: "SendWishOnline FAQ", url: "https://sendwishonline.com/en/faq" },
      {
        label: "SendWishOnline pricing",
        url: "https://sendwishonline.com/en/pricing",
      },
    ],

    metaTitle: "CardShare.ai vs SendWishOnline: An Ad-Free Option",
    metaDescription:
      "Comparing CardShare.ai and SendWishOnline for group ecards. CardShare.ai is free with no ads, designs the cover with AI, and includes a Slack app.",

    h1: "CardShare.ai vs SendWishOnline",
    lede: "Both let a group sign one card from a link for free, with no account needed to sign. CardShare.ai keeps free cards ad-free, and its AI designs a cover and drafts an opening note for the person you're celebrating",

    headToHead: {
      us: "No ads",
      usNote: "free cards stay ad-free",
      them: "Ads",
      themNote: "on free cards, or $2.99 per card to remove",
      themShot: "their ecard",
    },

    groups: [
      {
        name: "Price",
        rows: [
          {
            feature: "Free cards",
            us: "Yes",
            usMark: "yes",
            them: "Yes, up to 10 a day",
            themMark: "partly",
          },
          {
            feature: "Ad-free free cards",
            us: "Yes, no ads",
            usMark: "yes",
            them: "Ads are removed with Premium",
            themMark: "no",
          },
          {
            feature: "Paid option",
            us: "None needed",
            them: "Premium at $2.99 per card, or credit packs",
          },
        ],
      },
      {
        name: "Design and writing",
        rows: [
          {
            feature: "Cover design",
            us: "AI-designed from one sentence or your photo",
            usMark: "yes",
            them: "Choose from thousands of templates",
            themMark: "yes",
          },
          {
            feature: "AI message help",
            us: "Drafts the headline and opening note",
            usMark: "yes",
            them: NOT_LISTED,
            themMark: "no",
          },
        ],
      },
      {
        name: "Signing",
        rows: [
          {
            feature: "No account to sign",
            us: "No account needed",
            usMark: "yes",
            them: "No account needed",
            themMark: "yes",
          },
        ],
      },
      {
        name: "Sending",
        rows: [
          {
            feature: "Slack",
            us: "Slack app included",
            usMark: "yes",
            them: NOT_LISTED,
            themMark: "no",
          },
          {
            feature: "Scheduled delivery",
            us: "Send when you're ready",
            usMark: "no",
            them: "Yes, including bulk scheduling",
            themMark: "yes",
          },
        ],
      },
    ],

    pickThem: [
      "You want the card delivered automatically on a set date",
      "You send lots of cards and want bulk scheduling from a spreadsheet",
      "You'd rather choose a ready-made template",
    ],
    verdict:
      "Both are free to start and let people sign without an account. CardShare.ai keeps free cards ad-free and designs a cover for each person. SendWishOnline is stronger if you want scheduled or bulk delivery, or a large library of ready-made templates.",
    pickUs: [
      "You want free cards without ads",
      "You want a cover designed for this person and occasion",
      "You want help writing the opening note",
      "Your team lives in Slack",
    ],

    faqs: [
      {
        q: "Is there an ad-free alternative to SendWishOnline?",
        a: "Yes. CardShare.ai cards are free to design, sign and send, with no ads on the card.",
      },
      {
        q: "How much does SendWishOnline cost?",
        a: "As of September 2026, SendWishOnline offers up to 10 free cards a day, with ads. Premium removes ads at $2.99 per card, or with credit packs. CardShare.ai cards are free with no ads.",
      },
      {
        q: "What's the main difference between CardShare.ai and SendWishOnline?",
        a: "SendWishOnline offers a large template library and scheduled delivery, with ads on free cards. CardShare.ai uses AI to design a cover and opening note for each card, keeps free cards ad-free, and includes a Slack app.",
      },
      {
        q: "Do signers need an account on CardShare.ai?",
        a: "No. Signers open the link in their browser, write a note and can add a GIF.",
      },
    ],
  },
}

export const ALL_COMPARE_SLUGS = Object.keys(COMPARE_CONFIGS)

export function getCompareConfig(slug: string): CompareConfig | undefined {
  return COMPARE_CONFIGS[slug]
}
