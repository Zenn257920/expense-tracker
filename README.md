# Expense Tracker

A personal finance dashboard for tracking income and expenses by category.

## Features

- Dashboard totals and a six-month income and expense chart
- Create and browse income and expense categories
- Add, search, edit, and delete transactions
- PostgreSQL persistence through Neon and Drizzle ORM

## Setup

1. Install dependencies with `pnpm install`.
2. Add a `DATABASE_URL` connection string to `.env.local`.
3. Apply database migrations with `pnpm db:migrate`.
4. Start the development server with `pnpm dev`.

The app currently uses the temporary demo identity in `src/lib/demo-user.ts`.
Replace it with an authenticated user before deploying the app for real users.

## Commands

- `pnpm dev` — start the development server
- `pnpm build` — create a production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — check TypeScript types
- `pnpm db:generate` — generate a migration from schema changes
- `pnpm db:migrate` — apply pending migrations
- `pnpm db:studio` — open Drizzle Studio
