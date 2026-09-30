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
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_oauth_app_client_secret
GIPHY_API_KEY=your_giphy_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="CardShareAI <noreply@your-domain.com>"
SEND_EMAIL_HOOK_SECRET="v1,whsec_<secret-from-supabase-dashboard>"

# Optional: text models via the gateway. Both default to google/gemini-3.8-flash.
# AI_HEADLINE_MODEL=anthropic/claude-opus-5.5  # card front headline (generate-headline)
# AI_MESSAGE_MODEL=anthropic/claude-opus-5.5   # card inside note (generate-message)

# PostHog (EU Cloud) — project API key from eu.posthog.com project settings
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
# Client reverse proxy: /t for local dev; https://t.cardshare.ai in production (see PostHog proxy below)
NEXT_PUBLIC_POSTHOG_API_HOST=/t
```

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
