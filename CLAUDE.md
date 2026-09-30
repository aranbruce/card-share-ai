# CLAUDE.md

## Project Overview

CardShareAI is an AI-powered virtual greeting card creator. Users create personalized cards with AI-generated text and images, and can invite group contributions via shareable links.

- **Framework**: Next.js 16.2.5 (App Router), React 19.2.6, TypeScript 6.0.3
- **Package manager**: pnpm 9.8.0 (Node 24 LTS via `.nvmrc`; see README)
- **Database**: Supabase (PostgreSQL with RLS) — `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.10.x
- **Auth**: Supabase Auth (Google + GitHub OAuth)
- **AI**: Vercel AI SDK 6.x (`ai` package); Vercel AI Gateway for text (`google/gemini-3.8-flash` by default for headlines and messages), Gemini for image generation
- **Styling**: Tailwind CSS 4.2.4, shadcn/ui (Radix UI primitives, Lucide icons)
- **Testing**: Vitest 4.x (unit), Playwright 1.60.x (E2E)

## Before Pushing Changes

Always run these three commands before pushing:

```bash
pnpm fix      # Auto-fix formatting (Prettier) and lint issues (ESLint)
pnpm test     # Run unit tests
pnpm e2e      # Run Playwright E2E tests
```

All three must pass with no errors before a push or PR.

## Common Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run unit tests (Vitest, one-shot)
pnpm test:watch       # Run unit tests in watch mode
pnpm e2e              # Run Playwright E2E tests
pnpm e2e:headed       # E2E with visible browser
pnpm lint             # ESLint
pnpm format:check     # Check Prettier formatting
pnpm fix              # Auto-fix formatting and lint issues
```

## Project Structure

```
app/
  api/                # API routes (cards, generate-headline, generate-message, generate-image, giphy, contribute)
  (auth)/             # Auth pages at /login, /sign-up, /callback, etc. (route group)
  create/             # Card creation flow
  dashboard/          # User dashboard and card management
  contribute/[linkId] # Group contribution page
  view/[linkId]       # Public card view
components/
  card-3d/            # 3D card visualization
  contribute/         # Contribution UI components
  ui/                 # shadcn/ui primitives
lib/                  # Utilities and business logic
  supabase/           # Supabase client helpers
  *.test.ts           # Unit tests live alongside source files
hooks/                # Custom React hooks
e2e/                  # Playwright E2E tests
supabase/migrations/  # Database migration history
```

## Testing

**Unit tests** (Vitest) live in `lib/**/*.test.ts`. Run with `pnpm test`.

**E2E tests** (Playwright) live in `e2e/`. They require authenticated session storage in `playwright/.auth/user.json` — run the auth setup first if missing. Set `E2E_EMAIL` and `E2E_PASSWORD` env vars.

## Code Style

- **No semicolons**, double quotes (Prettier config)
- Tailwind classes ordered by the Prettier Tailwind plugin
- TypeScript strict mode — no `any` unless unavoidable
- Path alias `@/*` resolves to the project root

## Environment Variables

Copy `.env.local` from a team member or pull via `vercel env pull`. Key variables:

| Variable                            | Purpose                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase project URL                                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase public key                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server-side Supabase admin key                                                      |
| `POSTGRES_URL`                      | Database connection string                                                          |
| `GIPHY_API_KEY`                     | Giphy API for GIF search                                                            |
| `AI_GATEWAY_API_KEY`                | Vercel AI Gateway key                                                               |
| `AI_HEADLINE_MODEL`                 | Override the headline model (optional, defaults to `google/gemini-3.8-flash`)       |
| `AI_MESSAGE_MODEL`                  | Override the inside-message model (optional, defaults to `google/gemini-3.8-flash`) |
| `AI_IMAGE_GATEWAY_MODEL`            | Override card cover image model (default `google/gemini-3.1-flash-image-preview`)   |
| `E2E_EMAIL` / `E2E_PASSWORD`        | Test account credentials for Playwright                                             |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog project API key (EU Cloud)                                                  |
| `NEXT_PUBLIC_POSTHOG_HOST`          | PostHog ingest API for server-side SDK (`https://eu.i.posthog.com`)                 |
| `NEXT_PUBLIC_POSTHOG_API_HOST`      | Client proxy: `/t` locally, `https://t.cardshare.ai` in production                  |

PostHog **AI observability** reuses `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`. OpenTelemetry starts in `instrumentation.ts`; AI routes enable `experimental_telemetry` via `lib/ai-telemetry.ts`. See README “PostHog AI observability”.

## Key Architecture Notes

- **Card states**: Draft → Collecting → Sent
- **Contributions**: Group members add messages/GIFs via a shareable link (`/contribute/[linkId]`); each contribution has an edit token for post-submission edits
- **Image handling**: `lib/resolve-image-for-model.ts` centralises image validation and normalisation before passing to AI models; multiple source types (upload, URL, base64) are handled here alongside `lib/source-image-limits.ts`
- **Pending card storage**: `lib/pending-card-storage.ts` preserves in-progress card state across auth redirects
- **AI text models**: Configured via `lib/ai-text-model.ts`; headlines read `AI_HEADLINE_MODEL`, inside messages read `AI_MESSAGE_MODEL`
- **PostHog AI observability**: `instrumentation.ts` + `lib/posthog-ai-otel.ts` export LLM spans; `lib/ai-telemetry.ts` on `generateText`; distinct ID via `X-POSTHOG-DISTINCT-ID` from the client
- **Supabase RLS**: All database access enforces Row Level Security; use the service role key only in API routes, never client-side
