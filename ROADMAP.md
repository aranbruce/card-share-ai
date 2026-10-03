# Roadmap

What we plan to build next, roughly in priority order. Move items to **Done** (with the PR) when they ship, and add notes as decisions are made.

## Next

### Funny photo templates

Pre-made humorous scenes where the user uploads a photo and the person is placed into the scene, e.g. astronaut on the moon, Renaissance portrait, superhero poster, "employee of the century" magazine cover, retirement on a beach.

- A template is a preset on the existing cover pipeline (`app/api/generate-image`): a scene prompt, an optional reference scene image, and a required photo upload
- Template picker in the create flow, filterable by occasion; templates double as SEO gallery content for `/cards/[slug]`
- Data-driven list (like `lib/category-pages.ts`) so new templates don't need code changes

Prototype (2026-10-02): 5 scenes from one headshot on `google/gemini-3.1-flash-image-preview`, using the same settings as the cover route. All 5 generated with no refusals, ~11s each.

- Likeness was strong in photographic scenes (astronaut, beach, magazine). It was weaker in stylised ones: the Renaissance portrait aged her, and the comic-style superhero looked fairly generic
- The model sometimes adds text despite "no text" (an "Employee of the Century" plaque) and loosely follows details (the laptop floated rather than sank)
- Best case only: one well-lit, front-facing, single-person photo, one run per scene. Still to test: casual phone selfies, group photos, sunglasses or side profiles, and repeat runs for consistency

First version built (2026-10-02): 17 scenes (4 birthday, 4 thank you, 3 congratulations, 3 holiday, 3 for any card), a Template carousel on the create flow's cover step ("No template" by default), generation wired through `app/api/generate-image` with a `templateId`. The route sends a layout reference (the scene with the stand-in's whole head blanked, in `assets/template-layouts/`) plus the person's photo, so covers match the thumbnail but keep the person's own face and hair. `scripts/generate-template-thumbnails.mjs` makes both the face-oval thumbnails and the layout references.

Open questions:

- **Privacy (resolved 2026-10-03):** uploaded photos are never stored. Every path (create form, cover redraw, MCP photo picker) sends them to the image model and drops them; only the drawn cover is saved, and PostHog AI spans redact base64 media. The MCP card view, home FAQ and privacy policy say so
- **Claude directory:** the [Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) lists AI image generation as unsupported, but exempts design tools that generate "design assets" as part of a design workflow, provided image generation isn't the primary service. Cover art might qualify (already asked mcp-review@anthropic.com); photo-into-scene templates look more like standalone image generation, so they're riskier. If needed, leave them out of the Claude connector only
- **Cost:** image edits are the most expensive call. May need lower rate limits, or make templates a premium feature

### Occasion page galleries

The gallery slot after the hero on `components/category-landing-page.tsx` now shows the photo templates section (#99). Real sample cards could still go on these pages; the unused `gallery*` fields in `lib/category-pages.ts` were meant for them.

### Group gift pot

Contributors chip in towards a gift card while signing, and the recipient picks the brand when they open the card. This is the main monetisation idea: cards stay free to send, and we add a small fee on top of each chip-in (Thankbox charges 1.1% + £0.17 in GBP, 2.9% + $0.19 in USD). Thankbox and GroupCards.io both have this; our compare pages currently send people to Thankbox for it.

No provider runs the whole flow (payments, holding the pot, buying the gift card) as an embeddable API, so it's built in stages:

1. **Test demand:** an "Add a group gift" link on the card that sends organisers to an existing pot service such as GiftRound. Ask GiftRound about a referral deal
2. **Manual v1:** Stripe Checkout on the contribute page (cards, Apple/Google Pay, UK Pay by Bank) for the amount plus our fee; a webhook records it in a `gift_contributions` table and the card shows the pot total. When a card with a pot is sent, buy a recipient-choice gift card by hand in the Tremendous dashboard and add the redeem link. Refunds by hand in Stripe
3. **Automate:** order through the Tremendous API when the card is sent, and refund automatically if a card is deleted or never sent. Hook into scheduled delivery

Provider notes (researched 2026-10-03):

- **Gift cards:** Tremendous (Thankbox runs on it; free self-serve sandbox; face value, so our fee is the only margin). Tillo powers GiftRound and may offer brand discounts; Runa is unclear. Tango's terms ban resale to consumers, and Giftbit reportedly doesn't allow crowd-gifting. Leave Tremendous's own prepaid Visa out of the catalogue (class action over its fees)
- **Payments:** Stripe is fastest. Mangopay is the cleaner long-term option: it holds pooled funds in per-pot e-wallets as the regulated party, and GiftRound uses it. GoCardless Instant Bank Pay works for UK/EU bank payments only, so not on its own

Open questions:

- **Regulation:** holding contributors' money for weeks may count as a payment service in the UK and EU. Get a fintech lawyer's view, and explain the use case to Stripe when onboarding
- **Fraud:** a small-payment form attracts card testing, and chargebacks after a gift card is delivered are a straight loss. Stripe Radar, rate limits and BotID; only fulfil when the card is sent
- **Rules:** minimum pot, organiser cancellation and refunds, and what happens to the money if a card is never sent
- **Claude connector:** keep payments out of the MCP tools to avoid directory review problems

## Later

- **Keepsake export:** PDF/image of the full card with all messages
- **Premium tier:** candidates are scheduling, export, premium templates and designs. No payments exist yet
- **Social sharing** of sent cards (recipient opt-in)
- **Analytics for owners:** opened/viewed tracking on sent cards
- **Owner notifications and reminders:** email the owner when people sign (a digest, not one per message), and nudge them before the send time if few have signed. Moved here 2026-10-03: without controls it risks feeling spammy, so it needs an email settings area first, where owners choose which emails they get (including the scheduled-send "delivered" email; "wasn't sent" should always go), plus an unsubscribe link in each email
- **Golden ticket invites:** invite friends to CardShareAI with a fun "golden ticket" card, built on the existing card view. Could feed referral rewards if the premium tier happens
- **Leaderboard:** most cards created. Needs opt-in and display names, since there are no public profiles yet, and should count real cards (e.g. sent, with contributions) so it can't be farmed with empty drafts
- **User-made templates:** save a card's design as a reusable template (headline, message, cover), optionally published for others to use. Separate from the curated photo templates; public ones need moderation and a report option

## Parked

- **3D card view in the MCP connector:** waiting for the OpenAI and Anthropic directory reviews
- **Microsoft Teams app:** scoped 2026-10-02 and shelved

## Done

- Share card links to WhatsApp, Messages, Telegram and email from both share dialogs (#107)
- Scheduled delivery: website, with a split Send dialog (#105, #106), then Slack and the Claude/ChatGPT tools (#109). An hourly cron (`app/api/cron/send-scheduled`, needs `CRON_SECRET`) emails the recipient; schedules live in `card_send_schedules`, which only the service role writes
- Redesigned link previews, sent as small JPEGs so WhatsApp shows them (#104)
- 34 funny photo templates, and a photo templates section on the home, Browse and occasion pages (#92, #99)
- MCP connector for Claude and ChatGPT (#82–#85)
- Slack app with `/cardshareai` flow (#88, #89)
- Supabase Auth IP forwarding (#81)
