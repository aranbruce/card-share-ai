# CardShareAI - Virtual Greeting Card Creator

An AI-powered app for creating and sharing personalized virtual greeting cards with group contribution features.

## Features

- **AI-Generated Cards**: Automatically generate card text and images using AI
- **Multiple Card Types**: Birthday, Thank You, Congratulations, Holiday, and Custom cards
- **Group Contributions**: Share unique links with friends and family to add messages and optional GIFs before sending
- **Card Editing**: Manually edit generated text or regenerate using AI
- **Easy Sharing**: Share via link copy or email delivery
- **User Accounts**: Secure authentication with Supabase to save and manage cards

## Tech Stack

- **Frontend**: Next.js 16 with React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI Services**:
  - Text Generation: Vercel AI Gateway (default `google/gemini-3.8-flash` for both headlines and inside messages; override each with `AI_HEADLINE_MODEL` / `AI_MESSAGE_MODEL`)
  - Image Generation: Vercel AI SDK (Gemini 3.1 Flash Image Preview)
- **Authentication**: Supabase Auth

## Setup

### Prerequisites

- Node.js 24+ (see `.nvmrc`; use `nvm use` in the project root)
- Supabase project

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
# Optional: new-style secret key (sb_secret_…) for server-side Auth calls only, so Supabase
# rate-limits per visitor IP (sb-forwarded-for) instead of per server. See "Auth rate limits" below.
SUPABASE_SECRET_KEY=your_secret_key
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_oauth_app_client_secret
GIPHY_API_KEY=your_giphy_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="CardShareAI <noreply@your-domain.com>"
SEND_EMAIL_HOOK_SECRET="v1,whsec_<secret-from-supabase-dashboard>"

# Optional: text models via the gateway. Both default to google/gemini-3.8-flash.
# AI_HEADLINE_MODEL=anthropic/claude-opus-5.5  # card front headline (generate-headline)
# AI_MESSAGE_MODEL=anthropic/claude-opus-5.5   # card inside note (generate-message)

# MCP connector: signs the short-lived photo upload links in the card view.
# Any long random string (openssl rand -base64 32). Without it, photo covers are off.
MCP_PHOTO_TOKEN_SECRET=your_random_secret
# Optional: OpenAI's domain check for publishing the ChatGPT app, served at
# /.well-known/openai-apps-challenge. Paste the token from platform.openai.com/plugins.
# OPENAI_APPS_CHALLENGE_TOKEN=your_challenge_token

# PostHog (EU Cloud) — project API key from eu.posthog.com project settings
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
# Client reverse proxy: /t for local dev; https://t.cardshare.ai in production (see PostHog proxy below)
NEXT_PUBLIC_POSTHOG_API_HOST=/t
```

### Auth rate limits (IP forwarding)

Supabase rate-limits Auth per IP (e.g. 30 token refreshes and 30 OTP verifications per 5 minutes).
The middleware session refresh and the `/callback` / `/recovery-callback` routes call Supabase Auth
from the server, so without forwarding every visitor shares the server's budget.

`lib/supabase/auth-server.ts` builds an auth-only client for those calls. When `SUPABASE_SECRET_KEY`
is set, it uses that key and sends `sb-forwarded-for` with the visitor's IP (the first
`x-forwarded-for` hop, which Vercel sets). Supabase only honours the header for secret keys, so:

1. Create a secret key in the Supabase dashboard (Project Settings → API Keys) and set `SUPABASE_SECRET_KEY`.
2. Turn on **Enable IP address forwarding** under Auth → Rate Limits.

The secret key bypasses RLS, so this client exposes only the Auth API. Data queries stay on the
anon-key clients (`lib/supabase/server.ts`, `client.ts`). Without the env var it falls back to the
anon key and per-server limits. See https://supabase.com/docs/guides/auth/rate-limits.

### PostHog reverse proxy (EU, ad-blocker safe)

Analytics uses a first-party reverse proxy to PostHog EU (`eu.i.posthog.com`), not third-party tracking domains.

- **Local**: `NEXT_PUBLIC_POSTHOG_API_HOST=/t` — browser sends events to `/t/e/` on the dev server.
- **Production**: `NEXT_PUBLIC_POSTHOG_API_HOST=https://t.cardshare.ai` — use a generic subdomain (not `analytics`, `posthog`, or `ph`).

**Vercel + DNS (production, one-time):**

1. Vercel → Project → **Domains** → add `t.cardshare.ai` to this project.
2. At your DNS provider, add the CNAME record Vercel shows (usually `t` → `cname.vercel-dns.com`).
3. Set `NEXT_PUBLIC_POSTHOG_API_HOST=https://t.cardshare.ai` in Vercel env for Production (and Preview if desired).
4. Redeploy. Confirm `POST https://t.cardshare.ai/e/` returns 200 in the browser network tab.

Server-side events (`posthog-node` in API routes) use `NEXT_PUBLIC_POSTHOG_HOST` directly and do not use the proxy path.

Proxying is implemented in [`proxy.ts`](proxy.ts) via [`lib/posthog-proxy.ts`](lib/posthog-proxy.ts) (sets the `Host` header PostHog requires). Restart the dev server after changing `proxy.ts`.

### PostHog AI observability

LLM calls (headline, message, and image generation) send OpenTelemetry spans to PostHog when `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set. Uses the same token and `NEXT_PUBLIC_POSTHOG_HOST` as product analytics (no extra env vars).

- Bootstrap: [`instrumentation.ts`](instrumentation.ts) → [`lib/posthog-ai-otel.ts`](lib/posthog-ai-otel.ts) (`@ai-sdk/otel` + PostHog span processor)
- Per-call telemetry: [`lib/ai-telemetry.ts`](lib/ai-telemetry.ts) on each Vercel AI SDK `generateText` call (`telemetry` + optional `runtimeContext`)
- User linking: browser sends `X-POSTHOG-DISTINCT-ID` on AI API requests (see [`lib/posthog-client.ts`](lib/posthog-client.ts))

After generating a card locally, confirm events under **AI Observability → Traces / Generations** in the PostHog EU project. Restart the dev server after changing instrumentation.

### Enable Google and GitHub login in Supabase

1. **Google**: In [Google Cloud Console](https://console.cloud.google.com/), create OAuth 2.0 credentials (Web application) with:
   - **Authorized JavaScript origins**: your app origin (e.g. `http://localhost:3000`)
   - **Authorized redirect URIs**: `<YOUR_SUPABASE_URL>/auth/v1/callback`
2. In Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Enable the provider
   - Paste the Google OAuth client ID and client secret
3. **GitHub**: In GitHub, create an OAuth App with:
   - **Homepage URL**: your app URL (for local dev usually `http://localhost:3000`)
   - **Authorization callback URL**:
     `<YOUR_SUPABASE_URL>/auth/v1/callback`
4. In Supabase Dashboard → **Authentication** → **Providers** → **GitHub**:
   - Enable the provider
   - Paste the GitHub OAuth app client ID and secret
5. In Supabase Dashboard → **Authentication** → **URL Configuration**, ensure your app URL(s) are present in:
   - Site URL
   - Redirect URLs, including:
     - `http://localhost:3000/callback`
     - `http://localhost:3000/recovery-callback`
     - `https://<your-domain>/callback`
     - `https://<your-domain>/recovery-callback`

### Branded auth emails (password reset and email verification)

Card and contributor emails are sent through Resend from the app. Password reset and signup verification emails use the same branded templates once you enable Supabase's **Send Email** auth hook.

1. Deploy the app so `{NEXT_PUBLIC_APP_URL}/api/auth/send-email` is publicly reachable (Supabase cannot call `localhost`).
2. In Supabase Dashboard → **Authentication** → **Hooks**, create a **Send Email** hook.
3. Hook type: **HTTPS**
4. URL: `https://<your-domain>/api/auth/send-email`
5. Click **Generate Secret** and set the value as `SEND_EMAIL_HOOK_SECRET` in Vercel or `.env.local`.
6. Ensure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_SUPABASE_URL` are set.
7. Verify your sending domain in Resend (SPF, DKIM, DMARC).

Until the hook is enabled, auth emails continue using Supabase's default templates. Card and contributor emails use the branded layout immediately after deploy.

If `/forgot-password` shows **Error sending recovery email**, the Send Email hook is enabled but failing: confirm `/api/auth/send-email` is deployed on the hook URL, `SEND_EMAIL_HOOK_SECRET` matches the hook secret in Supabase (include the full `v1,whsec_…` value in env), and Resend credentials are set. Temporarily disable the hook in Supabase to fall back to built-in auth emails while debugging.

### Leaked password protection (Security Advisor)

If you use **email / password** sign-up, enable HaveIBeenPwned checks in the Supabase Dashboard so the linter warning clears and weak passwords are rejected: **Authentication** → **Providers** → **Email** → enable **Prevent use of leaked passwords** (wording may vary by dashboard version). See [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). OAuth-only projects can skip this.

### MCP server (Claude and ChatGPT connectors)

`/mcp` is a remote MCP server (Streamable HTTP, via `mcp-handler`) with three tools: `create_card`, `list_cards` and `get_card`. Each tool also renders an MCP Apps view (`lib/mcp/card-widget.ts`) that shows the card, or a grid of cards, inline in Claude and ChatGPT; other clients get the same text and links as before. Users sign in with OAuth 2.1, using **Supabase Auth's OAuth server** as the authorization server; our consent screen is `/oauth/consent`. Tool calls run as the signed-in user, so RLS applies.

One-time Supabase setup (Dashboard → **Authentication → OAuth Server**):

1. Turn on **OAuth 2.1 server**.
2. Set **Authorization path** to `/oauth/consent` (the Site URL must be the app's URL).
3. Leave **Allow Dynamic OAuth Apps** off. Tokens are full Supabase sessions, so only clients we register ourselves may ask users for access.
4. Under **OAuth Apps**, add one confidential app per platform, named as users should see it on the consent screen (e.g. "Claude" with redirect URI `https://claude.ai/api/mcp/auth_callback`). Claude needs the token endpoint auth method set to **Request body (`client_secret_post`)**; with `client_secret_basic` the connection fails after the consent screen. Store the client ID and secret in the team password manager.
5. Use asymmetric JWT signing keys (Project Settings → JWT Keys) so `getClaims` verifies tokens locally.

**Photo covers.** A photo attached to a Claude chat never reaches a connector's tools, so the card view has its own picker. `create_card_from_photo` shows the picker first; every card view has a "Use my photo" button. The view shrinks the photo in the browser and posts it to `/api/mcp/photo` with a 30-minute token signed with `MCP_PHOTO_TOKEN_SECRET`. That token sits in the tool result's `_meta`, which the view reads but the model never sees. The photo goes straight to the image model and isn't stored, as with reference photos on the website. Photo-first links are single-use: `mcp_photo_card_claims` records the card each one created, so a picker shown again (a reopened chat) or a retried upload returns that card instead of making another.

Try it: add `https://<your-domain>/mcp` as a custom connector in Claude (Settings → Connectors, with the client ID and secret under Advanced settings) or in ChatGPT developer mode, or run `npx @modelcontextprotocol/inspector` against `http://localhost:3000/mcp`.

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up the database:

   ```bash
   # Execute the migration in Supabase
   # scripts/001_init_database.sql
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

## Testing

### Unit tests

```bash
pnpm test
```

### End-to-end tests (Playwright)

Install browser dependencies once:

```bash
pnpm e2e:install
```

Run smoke tests:

```bash
pnpm e2e
```

For authenticated E2E flows, set these environment variables (do not commit real credentials):

```bash
E2E_EMAIL=your_test_user_email
E2E_PASSWORD=your_test_user_password
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Playwright setup project logs in once and saves session state to `playwright/.auth/user.json`,
which is then reused by authenticated tests (e.g. dashboard smoke coverage).

## Project Structure

```
app/
  ├── (auth)/               # Authentication pages (/login, /sign-up, /callback, …)
  ├── create/               # Card creation flow
  ├── contribute/           # Group contribution page
  ├── dashboard/            # Card management dashboard
  └── api/                  # API routes
components/
  ├── card-type-selector.tsx
  ├── card-details-form.tsx
  ├── card-preview.tsx
  └── share-modal.tsx
lib/
  └── supabase/            # Supabase utilities
```

## Key Flows

### Creating a Card

1. User selects card type
2. Enters recipient and sender details
3. AI generates personalized copy and image
4. User can edit or regenerate
5. Card is saved to database

### Contributing Messages

1. Card owner generates shareable link
2. Others visit `/contribute/[linkId]`
3. Add their message and optional GIF
4. Messages appear on the card in real-time

### Managing Cards

- Draft: Editable, can start collecting contributions
- Collecting: Accepting messages from others
- Sent: Locked, ready for recipient

## Future Enhancements

- PDF download with all messages
- Card sharing on social media
- Premium templates and designs
- Message scheduling
- Analytics and delivery tracking
