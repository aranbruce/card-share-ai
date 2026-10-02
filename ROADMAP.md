# Roadmap

What we plan to build next, roughly in priority order. Move items to **Done** (with the PR) when they ship, and add notes as decisions are made.

## Next

### Scheduled delivery and collection deadline

Group cards are tied to a date (birthday, farewell, anniversary), but today the owner has to remember to send them.

- `send_at` on cards; a Vercel Cron job moves due cards from Collecting → Sent and emails the recipient via the existing send-email route
- Optional collection deadline shown on the contribute page ("Card closes Friday")
- Expose in the Slack bot and MCP tools (`create_card` / `update_card`)

### Owner notifications and contributor reminders

Pairs with scheduling. Builds on the Resend setup in `lib/email/`.

- Email the owner when someone contributes (batched/digest, not one per contribution)
- Nudge the owner before the deadline when there are few signatures, with the share link ready to copy

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

- **Privacy:** uploaded face photos should be short-lived. Delete the source after generation and say so in the UI
- **Claude directory:** the [Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) lists AI image generation as unsupported, but exempts design tools that generate "design assets" as part of a design workflow, provided image generation isn't the primary service. Cover art might qualify (already asked mcp-review@anthropic.com); photo-into-scene templates look more like standalone image generation, so they're riskier. If needed, leave them out of the Claude connector only
- **Cost:** image edits are the most expensive call. May need lower rate limits, or make templates a premium feature

### Occasion page galleries

The gallery slot after the hero on `components/category-landing-page.tsx` now shows the photo templates section (#99). Real sample cards could still go on these pages; the unused `gallery*` fields in `lib/category-pages.ts` were meant for them.

## Later

- **Keepsake export:** PDF/image of the full card with all messages
- **Premium tier:** candidates are scheduling, export, premium templates and designs. No payments exist yet
- **Social sharing** of sent cards (recipient opt-in)
- **Analytics for owners:** opened/viewed tracking on sent cards

## Parked

- **3D card view in the MCP connector:** waiting for the OpenAI and Anthropic directory reviews
- **Microsoft Teams app:** scoped 2026-10-02 and shelved

## Done

- 34 funny photo templates, and a photo templates section on the home, Browse and occasion pages (#92, #99)
- MCP connector for Claude and ChatGPT (#82–#85)
- Slack app with `/cardshareai` flow (#88, #89)
- Supabase Auth IP forwarding (#81)
