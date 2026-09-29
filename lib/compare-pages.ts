/**
 * "CardShare.ai vs X" pages. Competitor details come only from each product's own
 * pricing and help pages; re-check them (and bump `checkedOn`) before changing copy.
 */

export interface CompareRow {
  feature: string
  us: string
  them: string
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

  rows: CompareRow[]

  /** Honest reasons someone might still pick the competitor. */
  pickThemTitle: string
  pickThem: string[]
  pickUsTitle: string
  pickUs: string[]

  faqs: { q: string; a: string }[]
}

export const COMPARE_CONFIGS: Record<string, CompareConfig> = {
  kudoboard: {
    slug: "kudoboard",
    lastModified: "2026-09-29",
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

    rows: [
      {
        feature: "Price to send a card",
        us: "Free",
        them: "One-time boards from $6.99; subscriptions from $25/month billed annually",
      },
      {
        feature: "AI-designed cover image",
        us: "Yes, from one sentence or your photo",
        them: "Not advertised",
      },
      {
        feature: "AI message help",
        us: "Drafts the headline and opening note",
        them: "Rewrites messages in styles like a haiku",
      },
      {
        feature: "Slack",
        us: "Slack app included",
        them: "Slack and Microsoft Teams on the Pro plan and above",
      },
      {
        feature: "Signers need an account",
        us: "No",
        them: "Not on most boards",
      },
      {
        feature: "Signers per card",
        us: "No limit",
        them: "Depends on the board; Lite boards take up to 20 posts",
      },
      {
        feature: "GIFs in messages",
        us: "Yes",
        them: "Yes",
      },
      {
        feature: "Card format",
        us: "A 3D greeting card that opens in the browser",
        them: "A digital board, with printed books and posters available",
      },
    ],

    pickThemTitle: "When Kudoboard might suit you better",
    pickThem: [
      "You want a printed book or poster of the board",
      "You need Microsoft Teams, HR system integrations or SSO",
      "You want automated birthday and anniversary boards across a large company",
    ],
    pickUsTitle: "When CardShare.ai is the better fit",
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
        q: "What's the main difference between CardShare.ai and Kudoboard?",
        a: "Kudoboard is a paid digital board where posts are laid out on a page. CardShare.ai makes a greeting card with an AI-designed cover and an opening note, which the group signs and the recipient opens like a real card. Sending one is free.",
      },
      {
        q: "Does CardShare.ai work in Slack?",
        a: "Yes. The CardShare.ai Slack app lets you create a card with a slash command and share the signing link in any channel.",
      },
      {
        q: "Can I switch from Kudoboard to CardShare.ai?",
        a: "Yes. There's nothing to migrate: start your next card on CardShare.ai and share the link the same way you would a board.",
      },
    ],
  },

  groupgreeting: {
    slug: "groupgreeting",
    lastModified: "2026-09-29",
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

    rows: [
      {
        feature: "Price to send a card",
        us: "Free",
        them: "$5.99 per card, or prepaid card bundles at 10% to 33% off",
      },
      {
        feature: "AI-designed cover image",
        us: "Yes, from one sentence or your photo",
        them: "Not advertised",
      },
      {
        feature: "AI message help",
        us: "Drafts the headline and opening note",
        them: "Not advertised",
      },
      {
        feature: "Signers need an account",
        us: "No",
        them: "No",
      },
      {
        feature: "Signers per card",
        us: "No limit",
        them: "No limit",
      },
      {
        feature: "Slack",
        us: "Slack app included",
        them: "Share the signing link in Slack",
      },
      {
        feature: "Scheduled delivery",
        us: "Send when you're ready",
        them: "Yes, at a date and time you pick",
      },
      {
        feature: "Card format",
        us: "A 3D greeting card that opens in the browser",
        them: "A multi-page ecard, with a PDF copy",
      },
    ],

    pickThemTitle: "When GroupGreeting might suit you better",
    pickThem: [
      "You want the card delivered automatically at a set date and time",
      "You want a PDF copy of the finished card",
    ],
    pickUsTitle: "When CardShare.ai is the better fit",
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
        q: "What's the main difference between CardShare.ai and GroupGreeting?",
        a: "GroupGreeting charges per card. CardShare.ai is free to send, and its AI designs a cover and drafts an opening note for the specific person and occasion.",
      },
      {
        q: "Does CardShare.ai work in Slack?",
        a: "Yes. The CardShare.ai Slack app lets you create a card with a slash command and share the signing link in any channel.",
      },
      {
        q: "Can signers add GIFs?",
        a: "Yes. Everyone who signs a CardShare.ai card can add a GIF alongside their message.",
      },
    ],
  },
  padlet: {
    slug: "padlet",
    lastModified: "2026-09-29",
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

    rows: [
      {
        feature: "Made for",
        us: "Group greeting cards",
        them: "Collaborative boards for any purpose",
      },
      {
        feature: "Price",
        us: "Free to design, sign and send",
        them: "Free plan with up to 3 padlets; Platinum from $15/month",
      },
      {
        feature: "Contributors need an account",
        us: "No",
        them: "No, guests can post unless the owner requires login",
      },
      {
        feature: "AI",
        us: "Designs the card cover and drafts the opening note",
        them: "Generates images inside posts, and can draft a whole board",
      },
      {
        feature: "Slack",
        us: "Slack app included",
        them: "Not advertised",
      },
      {
        feature: "What the recipient gets",
        us: "A 3D greeting card with every message inside, sent by email or link",
        them: "A link to the board",
      },
    ],

    pickThemTitle: "When Padlet might suit you better",
    pickThem: [
      "You want one tool for brainstorming, classrooms and cards",
      "You want contributors to post videos, audio or files",
      "Your school already uses Padlet with Microsoft Teams",
    ],
    pickUsTitle: "When CardShare.ai is the better fit",
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
        q: "Is there a free Padlet alternative for group cards?",
        a: "Yes. CardShare.ai lets you design a group card, collect signatures from one link, and send it for free. Signers don't need an account.",
      },
      {
        q: "Does CardShare.ai work in Slack?",
        a: "Yes. The CardShare.ai Slack app lets you create a card with a slash command and share the signing link in any channel.",
      },
    ],
  },

  sendwishonline: {
    slug: "sendwishonline",
    lastModified: "2026-09-29",
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

    rows: [
      {
        feature: "Free cards",
        us: "Yes",
        them: "Yes, up to 10 a day",
      },
      {
        feature: "Ads on free cards",
        us: "No",
        them: "Yes, removed with Premium",
      },
      {
        feature: "Paid option",
        us: "None needed",
        them: "Premium at $2.99 per card, or credit packs",
      },
      {
        feature: "Signers need an account",
        us: "No",
        them: "No",
      },
      {
        feature: "Cover design",
        us: "AI-designed from one sentence or your photo",
        them: "Choose from thousands of templates",
      },
      {
        feature: "AI message help",
        us: "Drafts the headline and opening note",
        them: "Not advertised",
      },
      {
        feature: "Slack",
        us: "Slack app included",
        them: "Not advertised",
      },
      {
        feature: "Scheduled delivery",
        us: "Send when you're ready",
        them: "Yes, including bulk scheduling",
      },
    ],

    pickThemTitle: "When SendWishOnline might suit you better",
    pickThem: [
      "You want the card delivered automatically on a set date",
      "You send lots of cards and want bulk scheduling from a spreadsheet",
      "You'd rather choose a ready-made template",
    ],
    pickUsTitle: "When CardShare.ai is the better fit",
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
