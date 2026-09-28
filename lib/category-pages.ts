export interface CategoryGalleryItem {
  gradient: string
  pill: string
  forText: string
  sigCount: string
  title: string
  subtitle: string
}

export interface CategoryStep {
  n: string
  title: string
  desc: string
}

export interface CategoryUseCase {
  color: string
  emoji: string
  title: string
  desc: string
}

export interface CategoryFAQ {
  q: string
  a: string
}

export interface CategoryConfig {
  slug: string
  label: string
  shortDesc: string

  // Meta
  metaTitle: string
  metaDescription: string

  // Hero
  badge: string
  h1Line1: string
  h1Muted: string
  h1Pop: string
  lede: string
  ctaText: string

  // Card visual
  frontGradient: string
  backGradient1: string
  backGradient2: string
  cardTitle: string
  /** Hue of the mockup card's cover on the browse tile, well apart from `frontGradient`. */
  coverHue: number
  sigFloat1: { color: string; count: string; recency: string }
  sigFloat2: { color: string; note: string; name: string }

  // Gallery
  galleryEyebrow: string
  galleryTitle: string
  gallerySub: string
  gallery: CategoryGalleryItem[]

  // How it works
  howTitle: string
  howSub: string
  steps: CategoryStep[]

  // Use cases
  usesEyebrow: string
  usesTitle: string
  uses: CategoryUseCase[]

  // FAQ
  faqEyebrow: string
  faqTitle: string
  faqs: CategoryFAQ[]

  // CTA band
  ctaBandTitle: string
  ctaBandSub: string
}

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  birthday: {
    slug: "birthday",
    label: "Birthday cards",
    shortDesc:
      "For the team, the family group chat, and the one they won't forget",

    metaTitle: "Group Birthday Cards for Coworkers",
    metaDescription:
      "Create a group birthday card online in seconds. Everyone signs from one link, AI drafts the cover and note, and it arrives as one beautiful card, by email or text. Free to start.",

    badge: "The group birthday card, minus the reply-all",
    h1Line1: "Group birthday cards,",
    h1Muted: "signed by everyone,",
    h1Pop: "sent as one",
    lede: "Start an online birthday card, share one link, and the whole team signs from their own phone. The AI drafts the cover and the opening note. You just pick who it's for",
    ctaText: "Start a birthday card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.88 0.08 18), oklch(0.82 0.09 48))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.88 0.07 150), oklch(0.82 0.08 180))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.07 70), oklch(0.82 0.08 110))",
    cardTitle: "Happy Birthday, Mira",
    coverHue: 280,
    sigFloat1: {
      color: "oklch(0.82 0.1 18)",
      count: "14 people signed",
      recency: "last note · 12m ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 210)",
      note: "Happy birthday!",
      name: "- Leo",
    },

    galleryEyebrow: "Birthday card examples",
    galleryTitle: "Birthday cards people actually kept",
    gallerySub:
      "Every cover is generated from a single sentence, then edited until it's right. Here are real birthday cards sent through CardShare.ai for coworkers, parents, best friends, and the group chat",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.08 18), oklch(0.82 0.09 48))",
        pill: "Coworker",
        forText: "For Mira",
        sigCount: "14 signatures",
        title: "Happy Birthday, Mira",
        subtitle: "Botanical · warm · the design team",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.08 330), oklch(0.82 0.09 360))",
        pill: "For Mom",
        forText: "For Mom",
        sigCount: "6 signatures",
        title: "Happy Birthday, Mom",
        subtitle: "Soft · heartfelt · us kids",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.08 70), oklch(0.82 0.09 110))",
        pill: "Milestone · 30th",
        forText: "For Jonas",
        sigCount: "22 signatures",
        title: "Thirty looks good on you",
        subtitle: "Bold · celebratory · the whole floor",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 250), oklch(0.82 0.08 280))",
        pill: "Best friend",
        forText: "For Elise",
        sigCount: "11 signatures",
        title: "Another trip around the sun",
        subtitle: "Playful · inside-jokes · the brunch club",
      },
    ],

    howTitle: "From one sentence to a signed card in minutes",
    howSub:
      "The birthday card used to take ten Slack messages and a folded piece of paper passed around the office. Now it takes one link",
    steps: [
      {
        n: "01",
        title: "Describe the birthday",
        desc: 'Tell us who it\'s for in a sentence e.g. "Mira turns 30 Thursday, loves botanical illustration." The AI drafts a cover and an opening note you can regenerate any time',
      },
      {
        n: "02",
        title: "Share one link, everyone signs",
        desc: "Drop the link in your group chat. Each person adds their note from their own phone, picks an ink colour, and can add a photo or GIF. It stays private until you send",
      },
      {
        n: "03",
        title: "Send it on the big day",
        desc: "When the card is full, schedule it to arrive on the morning of the birthday by email or a shareable link. It opens beautifully in the browser with every signature",
      },
    ],

    usesEyebrow: "Birthday cards for every kind of person",
    usesTitle: "Pick the one you need",
    uses: [
      {
        color: "oklch(0.88 0.08 18)",
        emoji: "💼",
        title: "Birthday cards for coworkers",
        desc: "The office classic. One link the whole team signs without anyone leaving their desk",
      },
      {
        color: "oklch(0.88 0.08 70)",
        emoji: "👔",
        title: "Birthday cards for your boss",
        desc: "Sincere, considered, never sycophantic. The AI keeps the tone exactly right",
      },
      {
        color: "oklch(0.88 0.07 330)",
        emoji: "🎂",
        title: "Milestone birthday cards",
        desc: "30th, 40th, 50th, 60th. Big-deal covers and copy that marks the moment",
      },
      {
        color: "oklch(0.88 0.07 250)",
        emoji: "🎉",
        title: "Birthday cards for friends",
        desc: "Inside jokes, group photos, the works. Made for the whole group chat to pile on",
      },
      {
        color: "oklch(0.88 0.07 150)",
        emoji: "❤️",
        title: "Birthday cards for family",
        desc: "For Mom, Dad, a sibling, or the group of cousins. Warm, personal, kept for years",
      },
      {
        color: "oklch(0.88 0.06 30)",
        emoji: "⏰",
        title: "Belated birthday cards",
        desc: "Missed it by a day or a week? Owning it warmly beats pretending you didn't",
      },
    ],

    faqEyebrow: "Birthday card FAQs",
    faqTitle: "Everything about sending one",
    faqs: [
      {
        q: "How do group birthday cards work?",
        a: "Start a card, share one link, and everyone adds their note from their own phone or laptop. No one sees the card until you decide it's full and send it. It arrives as a single, beautifully laid-out card on the big day.",
      },
      {
        q: "Can everyone sign the same birthday card online?",
        a: "Yes. There's no limit on signers. Each person places their message anywhere on the page, picks an ink colour, and can add a photo or GIF. The card stays completely private until you send it.",
      },
      {
        q: "Is CardShare.ai free?",
        a: "Yes, you can design a card, collect signatures, and send it for free. Paid plans add team features, scheduled sends, and a saved archive of every card you've organised.",
      },
      {
        q: "How do I send a birthday card by email or text?",
        a: "When the card's ready, enter the recipient's email address or copy a shareable link to drop into a text. They open it right in the browser. Nothing to download or install.",
      },
      {
        q: "Can I schedule the card to arrive on their birthday?",
        a: "Yes. Pick the date and time and CardShare.ai delivers it then, so the card lands right on the morning of the birthday, even if you set it up weeks ahead.",
      },
      {
        q: "Can I add photos, GIFs, or a group message?",
        a: "Every signer can add a photo or GIF alongside their note, and the AI can draft a shared opening message that sets the tone for the whole card.",
      },
    ],

    ctaBandTitle: "Whose birthday is coming up?",
    ctaBandSub:
      "Set up the card in two minutes, share the link, and let everyone sign. We'll handle the cover, the layout, and the reminder",
  },

  "thank-you": {
    slug: "thank-you",
    label: "Thank you cards",
    shortDesc: "For the team, the mentor, the neighbour who watched the dog",

    metaTitle: "Group Thank You Cards for Coworkers",
    metaDescription:
      "Create a group thank you card online in seconds. Share one link so the whole team signs, AI drafts the cover and opening note. Delivered beautifully by email or text. Free to start.",

    badge: "Thank you cards that actually land",
    h1Line1: "Group thank you cards,",
    h1Muted: "from the whole team,",
    h1Pop: "genuinely felt",
    lede: "Start a thank you card, share one link, and watch the whole team pile on with heartfelt notes. The AI drafts the cover and sets the tone. You just name who deserves it",
    ctaText: "Start a thank you card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.88 0.07 170), oklch(0.82 0.08 200))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.88 0.07 140), oklch(0.82 0.08 170))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.06 200), oklch(0.82 0.07 230))",
    cardTitle: "Thank you, Alex",
    coverHue: 18,
    sigFloat1: {
      color: "oklch(0.82 0.1 170)",
      count: "11 people signed",
      recency: "last note · 5m ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 240)",
      note: "Couldn't do it without you!",
      name: "- the team",
    },

    galleryEyebrow: "Thank you card examples",
    galleryTitle: "Thank you cards worth reading twice",
    gallerySub:
      "From mentor appreciation to team shout-outs, these are real thank you cards sent through CardShare.ai. Every cover generated from one sentence, every note from the heart",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 170), oklch(0.82 0.08 200))",
        pill: "For mentor",
        forText: "For Alex",
        sigCount: "8 signatures",
        title: "Thank you, Alex",
        subtitle: "Warm · genuine · the whole cohort",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 140), oklch(0.82 0.08 170))",
        pill: "For the team",
        forText: "For the team",
        sigCount: "16 signatures",
        title: "You all made it happen",
        subtitle: "Celebratory · heartfelt · from leadership",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 200), oklch(0.82 0.07 230))",
        pill: "Volunteer",
        forText: "For Sophie",
        sigCount: "12 signatures",
        title: "Thank you for everything",
        subtitle: "Sincere · personal · the whole org",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 110), oklch(0.82 0.08 140))",
        pill: "Personal",
        forText: "For Raj",
        sigCount: "4 signatures",
        title: "We couldn't have done it",
        subtitle: "Intimate · specific · a close team",
      },
    ],

    howTitle: "From one sentence to a heartfelt group card",
    howSub:
      "Getting a whole team to say thank you used to mean chasing people for signatures. Now it takes one link and five minutes",
    steps: [
      {
        n: "01",
        title: "Name who you're thanking",
        desc: "Tell us who it's for and why. One sentence is enough. The AI writes a cover and an opening note that captures the moment without being over the top",
      },
      {
        n: "02",
        title: "Share one link, everyone adds their note",
        desc: "Send the link to your team, the group chat, or the whole org. Each person signs from their own device, adds their message, and can include a photo or GIF",
      },
      {
        n: "03",
        title: "Send it when you're ready",
        desc: "When everyone's signed, deliver it by email or shareable link. It arrives as one beautiful card, with every note and signature laid out perfectly",
      },
    ],

    usesEyebrow: "Thank you cards for every kind of person",
    usesTitle: "Who are you thanking?",
    uses: [
      {
        color: "oklch(0.88 0.07 170)",
        emoji: "🙏",
        title: "Thank you cards for coworkers",
        desc: "For the colleague who covered for you, saved the launch, or just always shows up",
      },
      {
        color: "oklch(0.88 0.07 140)",
        emoji: "👏",
        title: "Thank you cards for managers",
        desc: "A group card from the whole team tells them more than a one-liner in Slack ever could",
      },
      {
        color: "oklch(0.88 0.06 200)",
        emoji: "🌅",
        title: "Thank you cards for retiring colleagues",
        desc: "Send them off with a card full of notes from everyone they worked with over the years",
      },
      {
        color: "oklch(0.88 0.07 110)",
        emoji: "📚",
        title: "Thank you cards for teachers",
        desc: "From the whole class, the whole parent group, or just the students who meant it most",
      },
      {
        color: "oklch(0.88 0.06 230)",
        emoji: "🤝",
        title: "Thank you cards for volunteers",
        desc: "Recognise the people who gave their time with something more than a quick mention",
      },
      {
        color: "oklch(0.88 0.07 80)",
        emoji: "💼",
        title: "Thank you cards for clients",
        desc: "Professional, warm, and personal. A signed card from the whole account team stands out",
      },
    ],

    faqEyebrow: "Thank you card FAQs",
    faqTitle: "Everything about sending one",
    faqs: [
      {
        q: "How do group thank you cards work?",
        a: "Start a card, share one link with your team or group, and everyone adds their own note from their own device. The card stays private until you send it. It arrives as one complete, laid-out card.",
      },
      {
        q: "Can the whole team sign the same thank you card?",
        a: "Yes, there's no limit on signers. Each person adds their note, picks their ink colour, and can attach a photo or GIF. It all comes together in one card.",
      },
      {
        q: "What's the right tone for a professional thank you card?",
        a: "The AI defaults to warm and sincere without being over the top. You can regenerate the cover message any time, or edit it word by word to get the tone exactly right for the person.",
      },
      {
        q: "Can I send a thank you card to someone outside the company?",
        a: "Yes. The recipient gets a link they open in the browser. No account needed. You can send it by email or share a link via any channel.",
      },
      {
        q: "How quickly can I set one up?",
        a: "The whole thing (card, cover, opening message, signature link) takes about two minutes to create. Collecting signatures is up to you, but people usually sign within the hour.",
      },
      {
        q: "Is it free to send a group thank you card?",
        a: "Yes. The free plan covers design, signatures, and sending. Paid plans add scheduled delivery, team features, and a card archive.",
      },
    ],

    ctaBandTitle: "Who deserves a thank you today?",
    ctaBandSub:
      "Set up the card in two minutes, share the link, and let everyone pile on. We'll handle the cover, the layout, and the delivery",
  },

  "work-anniversary": {
    slug: "work-anniversary",
    label: "Work anniversary cards",
    shortDesc: "One year or ten, mark the milestone with the whole team",

    metaTitle: "Group Work Anniversary Cards for Coworkers",
    metaDescription:
      "Create a group work anniversary card online. Share one link so the whole team signs, AI crafts the cover and note for 1, 5, or 10+ year milestones. Free to start.",

    badge: "Make the milestone mean something",
    h1Line1: "Work anniversary cards,",
    h1Muted: "from the whole team,",
    h1Pop: "worth keeping",
    lede: "Start a work anniversary card, share one link, and let everyone add a note, from the newest hire to the CEO. The AI marks the milestone with the weight it deserves",
    ctaText: "Start an anniversary card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.88 0.08 70), oklch(0.82 0.09 110))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.88 0.07 50), oklch(0.82 0.08 80))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.07 100), oklch(0.82 0.08 130))",
    cardTitle: "Five years, James",
    coverHue: 250,
    sigFloat1: {
      color: "oklch(0.82 0.1 70)",
      count: "18 people signed",
      recency: "last note · 2h ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 160)",
      note: "Five years of making us better.",
      name: "- your team",
    },

    galleryEyebrow: "Work anniversary card examples",
    galleryTitle: "Anniversary cards that mark the moment properly",
    gallerySub:
      "From one-year welcomes to decade-long tributes, these are work anniversary cards sent through CardShare.ai: milestone-worthy covers, notes from the whole team",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.08 70), oklch(0.82 0.09 110))",
        pill: "5 years",
        forText: "For James",
        sigCount: "18 signatures",
        title: "Five years of showing up",
        subtitle: "Sincere · milestone · the whole department",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 50), oklch(0.82 0.08 80))",
        pill: "10 years",
        forText: "For Sarah",
        sigCount: "26 signatures",
        title: "A decade of making us better",
        subtitle: "Warm · tribute · the whole company",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 100), oklch(0.82 0.08 130))",
        pill: "1 year",
        forText: "For Marcus",
        sigCount: "9 signatures",
        title: "One year down, many more to come",
        subtitle: "Welcoming · warm · the team",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 40), oklch(0.82 0.08 70))",
        pill: "Remote team",
        forText: "For Priya",
        sigCount: "14 signatures",
        title: "Three years, three time zones",
        subtitle: "Playful · global · distributed team",
      },
    ],

    howTitle: "From one sentence to a milestone card",
    howSub:
      "Work anniversaries used to get a generic auto-email. Now the whole team can sign something that actually means something",
    steps: [
      {
        n: "01",
        title: "Note the anniversary",
        desc: "Tell us who it's for and how long they've been around. \"Sarah hits ten years this Thursday, she built the whole CS team.\" The AI drafts a cover and note that honours the milestone",
      },
      {
        n: "02",
        title: "The whole team signs",
        desc: "Share one link with everyone: remote, in-office, across time zones. Each person adds their message, picks an ink colour, and can add a GIF or photo",
      },
      {
        n: "03",
        title: "Deliver it on the day",
        desc: "Schedule the card to land on the exact anniversary date, by email or shareable link. It arrives as one beautifully composed card, every note included",
      },
    ],

    usesEyebrow: "Anniversary cards for every milestone",
    usesTitle: "How long have they been with you?",
    uses: [
      {
        color: "oklch(0.88 0.08 70)",
        emoji: "📅",
        title: "One-year anniversary cards",
        desc: "A warm welcome into the fold. Mark the first year with something more than a calendar reminder",
      },
      {
        color: "oklch(0.88 0.07 50)",
        emoji: "⭐",
        title: "Five-year milestone cards",
        desc: "Half a decade is a big deal. Give it the weight it deserves with notes from the whole team",
      },
      {
        color: "oklch(0.88 0.07 100)",
        emoji: "🏆",
        title: "Ten-year (and beyond) cards",
        desc: "A decade of showing up. The whole company signs, and the AI helps every note say something real",
      },
      {
        color: "oklch(0.88 0.07 40)",
        emoji: "🌍",
        title: "Remote team anniversary cards",
        desc: "Distance doesn't matter. One link, everyone signs from wherever they are",
      },
      {
        color: "oklch(0.88 0.07 120)",
        emoji: "👥",
        title: "Manager anniversary cards",
        desc: "From the whole team they've built. A card full of notes is the best kind of leadership feedback",
      },
      {
        color: "oklch(0.88 0.06 80)",
        emoji: "🎖️",
        title: "Long-service recognition cards",
        desc: "For the people who have been around the longest, and made the culture what it is",
      },
    ],

    faqEyebrow: "Work anniversary card FAQs",
    faqTitle: "Everything about marking the milestone",
    faqs: [
      {
        q: "How do group work anniversary cards work?",
        a: "Start a card, share one link with the team, and everyone adds their note from their own device. The card stays private until you send it. It arrives as one beautifully composed card on the anniversary day.",
      },
      {
        q: "Can I set it up in advance and schedule the delivery?",
        a: "Yes. Create the card, collect signatures at your own pace, and schedule it to land on the exact anniversary date. CardShare.ai delivers it then. No manual reminder needed.",
      },
      {
        q: "What should I write in a work anniversary card?",
        a: "The AI drafts the opening message for you: warm, specific, and milestone-appropriate. You can regenerate it until it sounds right, or edit it word by word.",
      },
      {
        q: "Can remote team members sign from different time zones?",
        a: "Yes. Each person signs from their own device at their own time. No one needs an account. Just the link.",
      },
      {
        q: "How many people can sign?",
        a: "There's no limit. Whether it's a team of five or a company of five hundred, everyone gets the same link and adds their note.",
      },
      {
        q: "Is it free to send a group work anniversary card?",
        a: "Yes. Design, collect signatures, and send for free. Paid plans add scheduled delivery, team features, and an archive of every card you've organised.",
      },
    ],

    ctaBandTitle: "Whose work anniversary is coming up?",
    ctaBandSub:
      "Set up the card in two minutes, share the link, and let the whole team sign. We'll handle the cover, the milestone copy, and the delivery",
  },

  farewell: {
    slug: "farewell",
    label: "Farewell cards",
    shortDesc: "Send someone off with notes from everyone they worked with",

    metaTitle: "Group Farewell Cards for Coworkers",
    metaDescription:
      "Create a group farewell card online. Share one link so the whole team signs a leaving card, goodbye card, or retirement card. AI crafts the cover. Free to start.",

    badge: "Send them off the right way",
    h1Line1: "Farewell cards",
    h1Muted: "everyone signs,",
    h1Pop: "they'll always keep",
    lede: "Start a farewell card, share one link, and let everyone add a note, from their first week to their last day. The AI captures the tone of the moment so you don't have to",
    ctaText: "Start a farewell card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.88 0.07 250), oklch(0.82 0.08 285))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.88 0.06 230), oklch(0.82 0.07 260))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.06 270), oklch(0.82 0.07 300))",
    cardTitle: "Good luck, Dan",
    coverHue: 70,
    sigFloat1: {
      color: "oklch(0.82 0.1 250)",
      count: "19 people signed",
      recency: "last note · 30m ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 30)",
      note: "We'll miss you so much.",
      name: "- the whole team",
    },

    galleryEyebrow: "Farewell card examples",
    galleryTitle: "Goodbye cards people actually treasure",
    gallerySub:
      "From leaving the company to heading into retirement, these are farewell cards sent through CardShare.ai: covers that mark the moment, notes from everyone who'll miss them",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 250), oklch(0.82 0.08 285))",
        pill: "New adventure",
        forText: "For Dan",
        sigCount: "19 signatures",
        title: "Good luck, Dan",
        subtitle: "Warm · bittersweet · the whole team",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 230), oklch(0.82 0.07 260))",
        pill: "Retirement",
        forText: "For Margaret",
        sigCount: "24 signatures",
        title: "Here's to what comes next",
        subtitle: "Celebratory · heartfelt · the whole company",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 270), oklch(0.82 0.07 300))",
        pill: "Moving cities",
        forText: "For Kai",
        sigCount: "11 signatures",
        title: "The city's loss, their gain",
        subtitle: "Playful · affectionate · close team",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 200), oklch(0.82 0.07 230))",
        pill: "Parental leave",
        forText: "For Chloe",
        sigCount: "8 signatures",
        title: "See you on the other side",
        subtitle: "Warm · excited · the department",
      },
    ],

    howTitle: "From one sentence to a proper send-off",
    howSub:
      "The leaving card used to be a slightly damp piece of paper that made the rounds two hours before someone left. This is the version they'll actually keep",
    steps: [
      {
        n: "01",
        title: "Tell us who's leaving",
        desc: "One sentence is enough. \"Dan's leaving Friday after three years, he's joining a startup.\" The AI drafts a cover and an opening note that captures the moment",
      },
      {
        n: "02",
        title: "Drop the link in the group chat",
        desc: "Everyone signs from their own phone or laptop. No chasing, no circulating paper. Each person adds their note, picks an ink colour, and can add a GIF or photo",
      },
      {
        n: "03",
        title: "Send it on their last day",
        desc: "Deliver by email or shareable link whenever the time is right. It opens beautifully in the browser, with every note and signature as one card",
      },
    ],

    usesEyebrow: "Farewell cards for every kind of goodbye",
    usesTitle: "What kind of goodbye is this?",
    uses: [
      {
        color: "oklch(0.88 0.07 250)",
        emoji: "👋",
        title: "Leaving the company cards",
        desc: "For the colleague heading somewhere new. One card from everyone they worked with",
      },
      {
        color: "oklch(0.88 0.06 230)",
        emoji: "🏖️",
        title: "Retirement cards",
        desc: "Decades of showing up deserve more than a standard send-off. A card full of notes from the whole company",
      },
      {
        color: "oklch(0.88 0.06 270)",
        emoji: "🗺️",
        title: "Moving cities cards",
        desc: "A group card from everyone in the office, for the person who's heading somewhere new",
      },
      {
        color: "oklch(0.88 0.06 200)",
        emoji: "👶",
        title: "Parental leave cards",
        desc: "A warm send-off before their biggest adventure yet. Everyone signs before they head out",
      },
      {
        color: "oklch(0.88 0.05 280)",
        emoji: "🧭",
        title: "Career change cards",
        desc: "For the leap into something completely different. The team signs, the AI captures the excitement",
      },
      {
        color: "oklch(0.88 0.06 220)",
        emoji: "🔄",
        title: "Team restructure cards",
        desc: "When a team disbands or reorganises, give everyone a chance to say something real",
      },
    ],

    faqEyebrow: "Farewell card FAQs",
    faqTitle: "Everything about the goodbye card",
    faqs: [
      {
        q: "How do group farewell cards work?",
        a: "Start a card, share one link, and everyone adds their note from their own device. No one sees it until you decide it's ready to send. It arrives as one card on the day.",
      },
      {
        q: "Can I keep the card a surprise?",
        a: "Yes. The card is completely private until you choose to send it. Share the signing link with everyone except the person it's for.",
      },
      {
        q: "What should I write in a farewell card?",
        a: "The AI drafts the opening message: warm, specific, appropriate to the situation. You can regenerate it or edit it until it sounds right for the person and the moment.",
      },
      {
        q: "Can I include a photo in the farewell card?",
        a: "Yes. Each signer can add a photo or GIF alongside their note. You can also set a photo as the card cover.",
      },
      {
        q: "How many people can sign a leaving card?",
        a: "No limit. Whether it's a team of five or a whole building, everyone gets the same link and adds their own note.",
      },
      {
        q: "Can I schedule it to arrive at a specific time?",
        a: "Yes. Set the delivery time to land right when their last day ends, or whenever feels right. CardShare.ai handles the delivery.",
      },
    ],

    ctaBandTitle: "Who's leaving soon?",
    ctaBandSub:
      "Set up the card in two minutes, share the link, and let the team say what they actually feel. We'll handle the cover, the layout, and the delivery",
  },

  wedding: {
    slug: "wedding",
    label: "Wedding cards",
    shortDesc: "Collect warm words from the whole guest list in one keepsake",

    metaTitle: "Group Wedding Cards for Guests",
    metaDescription:
      "Create a group wedding card online. Share one link so every guest signs. AI designs the cover and sets the tone. Delivered beautifully before the big day. Free to start.",

    badge: "One keepsake from everyone who loves them",
    h1Line1: "Wedding cards,",
    h1Muted: "from everyone",
    h1Pop: "who loves them",
    lede: "Start a wedding card, share one link with the whole guest list, and collect heartfelt notes from everyone, wherever they are. The AI designs the cover and sets the tone",
    ctaText: "Start a wedding card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.89 0.05 330), oklch(0.84 0.06 360))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.89 0.05 310), oklch(0.84 0.05 340))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.05 350), oklch(0.83 0.06 20))",
    cardTitle: "James & Emma",
    coverHue: 250,
    sigFloat1: {
      color: "oklch(0.84 0.08 330)",
      count: "42 people signed",
      recency: "last note · 1h ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 200)",
      note: "Wishing you a lifetime of joy!",
      name: "- the Garcias",
    },

    galleryEyebrow: "Wedding card examples",
    galleryTitle: "Wedding cards they'll keep forever",
    gallerySub:
      "From intimate weddings to guest lists of hundreds, these are wedding cards created with CardShare.ai: beautiful covers, every guest's note in one keepsake",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.89 0.05 330), oklch(0.84 0.06 360))",
        pill: "Wedding day",
        forText: "James & Emma",
        sigCount: "42 signatures",
        title: "James & Emma",
        subtitle: "Romantic · elegant · all their guests",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.89 0.05 310), oklch(0.84 0.05 340))",
        pill: "Engagement",
        forText: "Leo & Noor",
        sigCount: "18 signatures",
        title: "You said yes!",
        subtitle: "Joyful · celebratory · friends & family",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 20), oklch(0.82 0.07 50))",
        pill: "Destination",
        forText: "Marta & Yusuf",
        sigCount: "28 signatures",
        title: "Love at every latitude",
        subtitle: "Adventurous · warm · the guest list",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.05 350), oklch(0.83 0.06 20))",
        pill: "Small wedding",
        forText: "Phil & Jo",
        sigCount: "9 signatures",
        title: "The most perfect day",
        subtitle: "Intimate · heartfelt · close family",
      },
    ],

    howTitle: "From one sentence to a keepsake card",
    howSub:
      "A card the couple will keep for years. One link, the whole guest list, collected in one beautiful place",
    steps: [
      {
        n: "01",
        title: "Describe the couple",
        desc: "Tell us their names and something about them, and the AI designs a cover and opening note that fits. You can regenerate it as many times as you like",
      },
      {
        n: "02",
        title: "Share the signing link",
        desc: "Share it in the group chat, the wedding WhatsApp, or email it directly. Every guest signs from their own device. No app needed",
      },
      {
        n: "03",
        title: "Deliver before the big day",
        desc: "Send it before the ceremony, on the day itself, or after. It arrives as one complete card, with every note and warm wish beautifully laid out",
      },
    ],

    usesEyebrow: "Wedding cards for every occasion",
    usesTitle: "What are you celebrating?",
    uses: [
      {
        color: "oklch(0.89 0.05 330)",
        emoji: "💒",
        title: "Wedding day cards",
        desc: "The whole guest list in one card. Share a link, everyone signs, the couple keeps it forever",
      },
      {
        color: "oklch(0.89 0.05 310)",
        emoji: "💍",
        title: "Engagement cards",
        desc: "For the moment they said yes. A card from everyone who wants to celebrate them",
      },
      {
        color: "oklch(0.88 0.05 350)",
        emoji: "🎁",
        title: "Bridal shower cards",
        desc: "The whole party signs before the big day, a warm-up act for the main event",
      },
      {
        color: "oklch(0.88 0.06 20)",
        emoji: "✈️",
        title: "Cards from destination guests",
        desc: "For the guests who couldn't make it. A signed card shows they were there in spirit",
      },
      {
        color: "oklch(0.88 0.04 340)",
        emoji: "💃",
        title: "Wedding party cards",
        desc: "From the bridesmaids, the best men, or both. Something personal before the ceremony",
      },
      {
        color: "oklch(0.88 0.05 300)",
        emoji: "💕",
        title: "Anniversary cards",
        desc: "First, fifth, tenth. Collect notes from everyone who's watched them grow together",
      },
    ],

    faqEyebrow: "Wedding card FAQs",
    faqTitle: "Everything about the keepsake card",
    faqs: [
      {
        q: "How do group wedding cards work?",
        a: "Start a card, share one link with the guest list, and everyone adds their note from their own device. You control when the card is sent. It arrives as one beautifully composed keepsake.",
      },
      {
        q: "How many guests can sign?",
        a: "There's no limit. Whether your guest list is ten people or two hundred, everyone gets the same link and adds their own personal note.",
      },
      {
        q: "Can guests add photos or personal messages?",
        a: "Yes. Every signer can add a photo or GIF alongside their message. The AI can also draft a shared opening note that sets the tone for the whole card.",
      },
      {
        q: "Can I keep it a surprise?",
        a: "Yes. The card stays completely private until you choose to send it, even if dozens of people have already signed.",
      },
      {
        q: "What format does the couple receive it in?",
        a: "They get a link they open in the browser. No app needed. It displays beautifully on any device, with every note laid out as one card.",
      },
      {
        q: "Can I send a wedding card by email?",
        a: "Yes. Enter the recipient's email address and CardShare.ai delivers it directly. Or copy a shareable link to send via text or any other channel.",
      },
    ],

    ctaBandTitle: "Who's getting married?",
    ctaBandSub:
      "Set up the card in two minutes, share the link with the guest list, and collect every warm wish in one place. We'll handle the cover, the layout, and the delivery",
  },

  promotion: {
    slug: "promotion",
    label: "Promotion cards",
    shortDesc: "New title, new chapter. Celebrate it as a group",

    metaTitle: "Group Promotion Cards for Coworkers",
    metaDescription:
      "Create a group promotion or congratulations card online. Share one link so the whole team signs, AI drafts the cover and note. Free to start.",

    badge: "Because a group emoji doesn't do it justice",
    h1Line1: "Congrats cards",
    h1Muted: "for the big moment,",
    h1Pop: "from everyone",
    lede: "Start a congratulations card, share one link, and let the whole team pile on. The AI drafts a cover that marks the occasion. You just describe what they achieved",
    ctaText: "Start a congrats card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.88 0.08 130), oklch(0.82 0.09 160))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.88 0.07 110), oklch(0.82 0.08 140))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.07 150), oklch(0.82 0.08 180))",
    cardTitle: "Congrats, Aria!",
    coverHue: 330,
    sigFloat1: {
      color: "oklch(0.82 0.1 130)",
      count: "14 people signed",
      recency: "last note · 20m ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 300)",
      note: "You've earned every bit of this.",
      name: "- the team",
    },

    galleryEyebrow: "Congratulations card examples",
    galleryTitle: "Cards for the moments worth celebrating",
    gallerySub:
      "Promotions, new jobs, graduations, new homes: these are congratulations cards sent through CardShare.ai. Every cover designed to mark the moment, every note from the people who mean it",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.08 130), oklch(0.82 0.09 160))",
        pill: "Promotion",
        forText: "For Aria",
        sigCount: "14 signatures",
        title: "Congrats on the promotion, Aria",
        subtitle: "Celebratory · warm · the whole team",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 110), oklch(0.82 0.08 140))",
        pill: "New job",
        forText: "For Ben",
        sigCount: "9 signatures",
        title: "On to bigger things",
        subtitle: "Proud · excited · close colleagues",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 150), oklch(0.82 0.08 180))",
        pill: "New home",
        forText: "For Sam",
        sigCount: "12 signatures",
        title: "Home sweet home",
        subtitle: "Joyful · personal · friends & family",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 90), oklch(0.82 0.08 120))",
        pill: "Graduation",
        forText: "For Zoe",
        sigCount: "22 signatures",
        title: "Congratulations, Dr. Zoe",
        subtitle: "Proud · milestone · class of friends",
      },
    ],

    howTitle: "From one sentence to a group celebration",
    howSub:
      "A big moment deserves more than a Slack emoji. Give them a card from the whole team they'll actually remember",
    steps: [
      {
        n: "01",
        title: "Describe the achievement",
        desc: 'Tell us who it\'s for and what they did. "Aria just got promoted to Director after two years of incredible work." The AI drafts a cover and note that celebrates them properly',
      },
      {
        n: "02",
        title: "Drop the link in the group",
        desc: "Share it in the team chat, by email, or wherever makes sense. Each person signs from their own device and adds their personal note",
      },
      {
        n: "03",
        title: "Send it at the right moment",
        desc: "Deliver it on the day of the announcement, the first day in the new role, or whenever feels right. It arrives as one complete congratulations card",
      },
    ],

    usesEyebrow: "Congrats cards for every kind of win",
    usesTitle: "What are you celebrating?",
    uses: [
      {
        color: "oklch(0.88 0.08 130)",
        emoji: "📈",
        title: "Promotion cards",
        desc: "From the whole team to the newly promoted. A card full of real notes beats a round of applause",
      },
      {
        color: "oklch(0.88 0.07 110)",
        emoji: "💼",
        title: "New job cards",
        desc: "For the colleague heading somewhere new and exciting. Everyone signs, the AI sets the tone",
      },
      {
        color: "oklch(0.88 0.07 150)",
        emoji: "🏡",
        title: "New home cards",
        desc: "Housewarming from the group chat. Personal, warm, something to keep on the mantle",
      },
      {
        color: "oklch(0.88 0.07 90)",
        emoji: "🎓",
        title: "Graduation cards",
        desc: "For the degree, the doctorate, or the qualification that took years. The whole cohort signs",
      },
      {
        color: "oklch(0.88 0.07 160)",
        emoji: "👶",
        title: "New baby cards",
        desc: "From the team, the friend group, or the whole extended family. Warm and celebratory",
      },
      {
        color: "oklch(0.88 0.06 120)",
        emoji: "🚀",
        title: "Business launch cards",
        desc: "For the founder, the freelancer, or the person who finally took the leap. Everyone sends their best",
      },
    ],

    faqEyebrow: "Congrats card FAQs",
    faqTitle: "Everything about celebrating someone",
    faqs: [
      {
        q: "How do group congratulations cards work?",
        a: "Start a card, share one link with your team or group, and everyone adds their note from their own device. The card stays private until you send it. It arrives as one complete, beautifully composed card.",
      },
      {
        q: "What occasions work well for a group congrats card?",
        a: "Any milestone worth marking: promotions, new jobs, graduations, new homes, new babies, business launches. If the group chat is buzzing about it, it's worth a card.",
      },
      {
        q: "Can I keep it a surprise?",
        a: "Yes. The card is completely private until you send it. Share the signing link with everyone except the person it's for.",
      },
      {
        q: "How quickly can I set one up?",
        a: "Under two minutes. Give the AI one sentence, and you'll have a cover, an opening note, and a signing link ready to share.",
      },
      {
        q: "Can the whole team sign without needing accounts?",
        a: "Yes. Signers just need the link. No account, no app, no download. They open it in the browser, add their note, and they're done.",
      },
      {
        q: "Is it free?",
        a: "Yes. Create the card, collect signatures, and send it for free. Paid plans add scheduled delivery and team features.",
      },
    ],

    ctaBandTitle: "What's the big news?",
    ctaBandSub:
      "Set up the card in two minutes, share the link, and let the whole team celebrate properly. We'll handle the cover, the copy, and the delivery",
  },

  kudos: {
    slug: "kudos",
    label: "Kudos cards",
    shortDesc: "Recognition that's worth more than a thumbs-up",

    metaTitle: "Group Kudos Cards for Coworkers",
    metaDescription:
      "Create a group kudos card online for employee recognition and appreciation. Share one link so the whole team signs. AI drafts the cover and note. Free to start.",

    badge: "Recognition that's worth more than a thumbs-up",
    h1Line1: "Kudos cards",
    h1Muted: "that say more than",
    h1Pop: "great work",
    lede: "Start a kudos card, share one link with the team, and let everyone add a note that means something. The AI drafts a cover that names the achievement, not just the person",
    ctaText: "Start a kudos card",

    frontGradient:
      "linear-gradient(135deg, oklch(0.88 0.07 220), oklch(0.82 0.08 250))",
    backGradient1:
      "linear-gradient(135deg, oklch(0.88 0.06 200), oklch(0.82 0.07 230))",
    backGradient2:
      "linear-gradient(135deg, oklch(0.88 0.06 240), oklch(0.82 0.07 270))",
    cardTitle: "Well done, Taylor",
    coverHue: 40,
    sigFloat1: {
      color: "oklch(0.82 0.1 220)",
      count: "8 people signed",
      recency: "last note · 3m ago",
    },
    sigFloat2: {
      color: "oklch(0.82 0.1 50)",
      note: "That launch was outstanding.",
      name: "- your peers",
    },

    galleryEyebrow: "Kudos card examples",
    galleryTitle: "Recognition cards that actually mean something",
    gallerySub:
      "From project wins to peer-to-peer shoutouts, these are kudos cards created with CardShare.ai: specific, sincere, and signed by the people who watched them do the work",
    gallery: [
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.07 220), oklch(0.82 0.08 250))",
        pill: "Above & beyond",
        forText: "For Taylor",
        sigCount: "8 signatures",
        title: "That launch was outstanding",
        subtitle: "Specific · peer recognition · the pod",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 200), oklch(0.82 0.07 230))",
        pill: "Project win",
        forText: "For the team",
        sigCount: "16 signatures",
        title: "We shipped it, together",
        subtitle: "Celebratory · team achievement · from leadership",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 240), oklch(0.82 0.07 270))",
        pill: "Welcome",
        forText: "For Jordan",
        sigCount: "6 signatures",
        title: "Great start, Jordan",
        subtitle: "Warm · welcoming · the whole team",
      },
      {
        gradient:
          "linear-gradient(135deg, oklch(0.88 0.06 180), oklch(0.82 0.07 210))",
        pill: "Peer kudos",
        forText: "For Alex",
        sigCount: "5 signatures",
        title: "The quiet MVP",
        subtitle: "Sincere · specific · colleagues",
      },
    ],

    howTitle: "From one sentence to meaningful recognition",
    howSub:
      'A generic "great job" wears thin fast. A card full of specific, signed notes from the people who saw it happen is the kind of recognition that sticks',
    steps: [
      {
        n: "01",
        title: "Name the achievement",
        desc: 'Tell us who it\'s for and what they did. "Taylor led the rebrand under impossible deadlines and made everyone feel calm the whole time." The AI writes something specific',
      },
      {
        n: "02",
        title: "Invite the team to add their voice",
        desc: "Share one link in Slack, email, or the team chat. Each person adds their own note. No account needed, no friction",
      },
      {
        n: "03",
        title: "Send it where it counts",
        desc: "Deliver by email or shareable link. It arrives as one complete card: specific, sincere, and signed by the people who mean it",
      },
    ],

    usesEyebrow: "Kudos cards for every kind of recognition",
    usesTitle: "What are you recognising?",
    uses: [
      {
        color: "oklch(0.88 0.07 220)",
        emoji: "⚡",
        title: "Above-and-beyond cards",
        desc: "For the person who went further than their job description asked. The team signs; the AI keeps it specific",
      },
      {
        color: "oklch(0.88 0.06 200)",
        emoji: "✅",
        title: "Project completion cards",
        desc: "When the team ships something hard, a card full of notes from the whole group marks it properly",
      },
      {
        color: "oklch(0.88 0.06 240)",
        emoji: "👋",
        title: "New employee welcome cards",
        desc: "A signed card from the whole team on day one sets the tone for everything that follows",
      },
      {
        color: "oklch(0.88 0.06 180)",
        emoji: "🙌",
        title: "Peer-to-peer recognition cards",
        desc: "For the colleague everyone knows does great work but rarely gets the credit. From the people who noticed",
      },
      {
        color: "oklch(0.88 0.06 250)",
        emoji: "👍",
        title: "Manager appreciation cards",
        desc: "From the whole team to the person who's been in their corner. Specific notes carry more weight than ratings",
      },
      {
        color: "oklch(0.88 0.05 210)",
        emoji: "📣",
        title: "Team shoutout cards",
        desc: "For a whole squad that pulled something off. Everyone signs for everyone, recognition in every direction",
      },
    ],

    faqEyebrow: "Kudos card FAQs",
    faqTitle: "Everything about recognising someone properly",
    faqs: [
      {
        q: "How are kudos cards different from other recognition tools?",
        a: "A kudos card is a permanent, shareable artefact, not a feed item that disappears in 24 hours. The recipient can open it any time, on any device, and see every note exactly as it was written.",
      },
      {
        q: "How do group kudos cards work?",
        a: "Start a card, share one link with the team, and everyone adds their note from their own device. The card is private until you send it. It arrives as one complete, beautifully composed card.",
      },
      {
        q: "Can signers add specific, personal notes?",
        a: "Yes. Each person writes their own note, picks their own ink colour, and can add a photo or GIF. The AI can also draft an opening message that names what was achieved.",
      },
      {
        q: "How many people can sign?",
        a: "No limit. Five colleagues or fifty. Everyone gets the same link and adds their own voice.",
      },
      {
        q: "Do signers need an account?",
        a: "No. They just need the link. They open it in the browser, add their note, and they're done.",
      },
      {
        q: "Is it free to send a kudos card?",
        a: "Yes. Design the card, collect notes, and send it for free. Paid plans add scheduled delivery, team features, and an archive.",
      },
    ],

    ctaBandTitle: "Who deserves the recognition?",
    ctaBandSub:
      "Set up the card in two minutes, share the link, and let the team say something specific. We'll handle the cover, the copy, and the delivery",
  },
}

export const ALL_CATEGORY_SLUGS = Object.keys(CATEGORY_CONFIGS)

export const BROWSE_CATEGORY_SLUGS = [
  "birthday",
  "work-anniversary",
  "wedding",
  "promotion",
  "thank-you",
  "farewell",
  "kudos",
] as const

export function getBrowseCategories(): CategoryConfig[] {
  return BROWSE_CATEGORY_SLUGS.map((slug) => CATEGORY_CONFIGS[slug])
}

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIGS[slug]
}
