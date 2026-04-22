# CardsAI - Virtual Greeting Card Creator

An AI-powered app for creating and sharing personalized virtual greeting cards with group contribution features.

## Features

- **AI-Generated Cards**: Automatically generate card text and images using AI
- **Multiple Card Types**: Birthday, Thank You, Congratulations, Holiday, and Custom cards
- **Group Contributions**: Share unique links with friends and family to add messages and optional GIFs before sending
- **Card Editing**: Manually edit generated text or regenerate using AI
- **Easy Sharing**: Share via link or (future) email integration
- **User Accounts**: Secure authentication with Supabase to save and manage cards

## Tech Stack

- **Frontend**: Next.js 16 with React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI Services**:
  - Text Generation: Vercel AI Gateway (default `xai/grok-4.1-fast-non-reasoning`; override with `AI_TEXT_MODEL`)
  - Image Generation: Vercel AI SDK (Gemini 3.1 Flash Image Preview)
- **Authentication**: Supabase Auth

## Setup

### Prerequisites

- Node.js 20.19 or later
- Supabase project

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_oauth_app_client_secret
GIPHY_API_KEY=your_giphy_api_key

# Optional: text routes (`generate-card-copy`, `regenerate-text`). Defaults to xAI Grok via the gateway.
# AI_TEXT_MODEL=openai/gpt-4o
```

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
   - Redirect URLs (e.g. `http://localhost:3000/auth/callback`)

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
  ├── auth/                 # Authentication pages
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

- Email integration (Resend)
- PDF download with all messages
- Card sharing on social media
- Premium templates and designs
- Message scheduling
- Analytics and delivery tracking
