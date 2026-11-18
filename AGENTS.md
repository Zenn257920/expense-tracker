<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project structure

This repository is a Next.js App Router expense and finance tracker. Application code lives in `src/` and uses the `@/*` import alias for paths under `src/`.

- `src/app/` contains route segments and layouts. Route groups `(auth)` and `(dashboard)` organize pages without changing their URLs. API endpoints live under `src/app/api/` as Route Handlers.
- `src/components/` contains feature components grouped by area (`auth`, `dashboard`, `loans`, `transactions`, and `layout`). Shared UI primitives live in `src/components/ui/`.
- `src/hooks/` contains reusable client hooks, such as `useCategories`.
- `src/lib/` contains shared utilities, authentication helpers, and API access. Client API calls use the Axios instance in `src/lib/api-client.ts` and typed feature methods in `src/lib/api.ts`. Reuse these instead of adding another HTTP client or fetching library. Server-side database operations may use feature services in `src/lib/services/`.
- `src/types/` contains shared TypeScript data types.
- `src/db/` contains the Drizzle database connection and schema. Database schema changes belong here and in the migration files under `drizzle/` only when the task requires a schema change.

When adding or changing a feature, inspect a neighboring feature with similar behavior and follow its existing API, hook, state, component, and styling patterns. Keep page-specific UI in its feature folder and shared UI in `src/components/ui/`. Do not introduce a new data-fetching architecture when the shared API client and existing hooks cover the use case.
