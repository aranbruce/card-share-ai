# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

CardsAI is a single Next.js 16 application (not a monorepo) that creates AI-powered greeting cards with group contributions. Backend logic lives in Next.js API routes. Data is stored in Supabase (PostgreSQL + Auth + Storage).

### Services

| Service | How to run | Port |
|---|---|---|
| Next.js dev server | `pnpm dev` | 3000 |
| Local Supabase | `supabase start` (requires Docker) | 54321 (API), 54322 (DB), 54323 (Studio) |

### Environment variables

Create `.env.local` from local Supabase output (`supabase status -o env`):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from supabase status>
```

AI features (text/image generation) are optional and degrade gracefully without keys.

### Commands

Standard commands in `package.json`:

- **Lint**: `pnpm lint` (ESLint) / `pnpm format:check` (Prettier)
- **Unit tests**: `pnpm test` (Vitest, 28 tests in `lib/**/*.test.ts`)
- **E2E tests**: `pnpm e2e` (Playwright, Chromium)
- **Dev server**: `pnpm dev`

### Gotchas

- **Supabase local setup requires Docker.** Install Docker, configure `fuse-overlayfs` storage driver and `iptables-legacy` for the nested-container environment, then run `supabase start`.
- **Baseline migration required.** The repo's `supabase/migrations/` are incremental and expect tables from `scripts/001_init_database.sql` to already exist. A baseline migration `20260410000000_init_database.sql` was added to bridge the gap.
- **Playwright port conflict.** When a dev server is already running on port 3000, run E2E tests with `PLAYWRIGHT_PORT=3000 pnpm e2e` to reuse it, since Next.js refuses to start a second dev server in the same directory.
- **Playwright browser install.** Run `pnpm e2e:install` once to download Chromium before running E2E tests.
- **Authenticated E2E tests** are skipped unless `E2E_EMAIL`, `E2E_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables are set.
