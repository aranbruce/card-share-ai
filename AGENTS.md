## Cursor Cloud specific instructions

### Overview

CardShareAI is a single Next.js 16 app (App Router, React 19) for creating AI-powered greeting cards. There is no monorepo; everything lives in one `package.json`.

### Running services

| Command                         | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `pnpm dev`                      | Start Next.js dev server on port 3000              |
| `pnpm lint`                     | ESLint                                             |
| `pnpm format:check`             | Prettier check                                     |
| `pnpm test`                     | Vitest unit tests (28 tests)                       |
| `pnpm e2e:install`              | Install Playwright Chromium + deps (run once)      |
| `PLAYWRIGHT_PORT=3000 pnpm e2e` | Playwright smoke tests (reuses running dev server) |

### Non-obvious caveats

- **Playwright port conflict**: By default `pnpm e2e` starts a _second_ dev server on port 3100. If a dev server is already running on 3000, Next.js will refuse to start another instance in the same directory. Use `PLAYWRIGHT_PORT=3000 pnpm e2e` to reuse the running server, or stop the existing one first.
- **Supabase required for full functionality**: All auth, card CRUD, and contribution flows need a real Supabase project. Without valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the app starts and renders pages but API calls will fail. Placeholder values are sufficient for builds, lint, and unit tests.
- **AI features require API keys**: Card text generation uses Vercel AI Gateway (model configurable via `AI_TEXT_MODEL` env var), and image generation uses Google Gemini. These require appropriate API credentials configured through the Vercel AI SDK.
- **Pre-existing formatting issues**: `pnpm format:check` may report issues in 2 files (`app/api/generate-image/route.ts`, `app/create/page.tsx`). These are pre-existing in the repo.
- **`.env.local`** is the standard location for local environment variables (git-ignored). See README for the full list.
- **E2E authenticated tests need `E2E_EMAIL` and `E2E_PASSWORD`**: Playwright's authenticated specs (`.authenticated.spec.ts`) require these env vars. The `card-create-delete` spec also needs working AI API keys — it will timeout without them because it waits up to 120s for card generation.
- **Creating test users via Supabase Admin API**: You can create and email-confirm a test user with `POST /auth/v1/signup` then `PUT /auth/v1/admin/users/{id}` with `{"email_confirm":true}` using the service role key. Set `E2E_EMAIL`/`E2E_PASSWORD` to those credentials for authenticated E2E tests.
- **Password reset / auth emails**: Branded reset and verification mail go through Supabase's **Send Email** hook → `POST /api/auth/send-email` (Resend). Requires `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` on the deployment Supabase calls (not only `.env.local`). Supabase cannot reach `localhost`; use a deployed URL or ngrok for the hook. Add `…/recovery-callback` to Supabase redirect URLs. `Error sending recovery email` usually means the hook URL 404s, the secret is missing/wrong, or Resend rejected the send.
