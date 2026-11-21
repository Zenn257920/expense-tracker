# Expense Tracker

A personal finance dashboard for tracking income and expenses by category.

## Features

- Dashboard totals and a six-month income and expense chart
- Create and browse income and expense categories
- Add, search, edit, and delete transactions
- Add a transaction by voice: tap the microphone in the Add transaction
  dialog, speak in Burmese (မြန်မာ) or English, review the filled-in
  amount / type / category / date, then save. Examples: "နေ့လည်စာ ငါးထောင်
  သုံးတယ်", "တက္ကစီ တစ်သောင်း ပေးတယ် မနေ့က", "Spent 5000 on lunch".
  Voice uses the browser's built-in speech recognition (Chrome works
  best; no API key needed) and a local parser — the app does not call an
  AI service at runtime. Tap an example phrase in the dialog to see how
  it is understood without using the microphone.
- PostgreSQL persistence through Neon and Drizzle ORM

## Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
3. Generate and inspect schema migrations with `pnpm db:generate`.
4. Apply approved migrations with `pnpm db:migrate`.
5. Start the development server with `pnpm dev`.

Authentication uses Better Auth with email and password. Each finance API route
gets the account ID from the server-side session and scopes reads and writes to
that account. Never send a client-provided user ID as an ownership check.

Generate a strong `BETTER_AUTH_SECRET` before deploying. Set `BETTER_AUTH_URL`
to the canonical app URL in each environment. Existing finance rows are retained
under their current user IDs; registering a new account does not claim legacy
demo data automatically.

## Deploy to Vercel

1. Push the project to a Git provider supported by Vercel, then import the repository at [vercel.com/new](https://vercel.com/new). Vercel detects Next.js and configures the build automatically.
2. In **Project Settings → Environment Variables**, add `DATABASE_URL` and `BETTER_AUTH_SECRET` for Production and Preview. Keep both values server-side; do not prefix them with `NEXT_PUBLIC_`.
3. Set `BETTER_AUTH_URL` to your production URL (for example, `https://your-app.vercel.app`) in the Production environment. Preview deployments use Vercel's deployment URL automatically.
4. Deploy, then test account registration, sign in, sign out, and the protected dashboard on the production URL.

Use a production Neon database URL and make sure its authentication tables are
migrated before testing signup. Keep `.env.local` and real credentials out of Git.

## Commands

- `pnpm dev` — start the development server
- `pnpm build` — create a production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — check TypeScript types
- `pnpm db:generate` — generate a migration from schema changes
- `pnpm db:migrate` — apply pending migrations
- `pnpm db:studio` — open Drizzle Studio
- `npx tsx scripts/verify-voice-parse.ts` — check the voice parser
  against English and Burmese example phrases (12 cases, no test
  framework needed)
