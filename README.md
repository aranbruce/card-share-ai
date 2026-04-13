# CardAI - Virtual Greeting Card Creator

An AI-powered app for creating and sharing personalized virtual greeting cards with group contribution features.

## Features

- **AI-Generated Cards**: Automatically generate card text and images using AI
- **Multiple Card Types**: Birthday, Thank You, Congratulations, Holiday, and Custom cards
- **Group Contributions**: Share unique links with friends and family to add messages before sending
- **Card Editing**: Manually edit generated text or regenerate using AI
- **Easy Sharing**: Share via link or (future) email integration
- **User Accounts**: Secure authentication with Supabase to save and manage cards

## Tech Stack

- **Frontend**: Next.js 15 with React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI Services**:
  - Text Generation: Vercel AI Gateway (GPT-4o)
  - Image Generation: fal.ai (Flux)
- **Authentication**: Supabase Auth

## Setup

### Prerequisites

- Node.js 18+
- Supabase project
- fal.ai API key

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FAL_KEY=your_fal_api_key
```

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
3. Add their name and message
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
