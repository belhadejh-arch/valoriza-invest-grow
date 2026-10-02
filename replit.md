# Valoriza Investment Hub

Valoriza backend services and a component-preview workspace for the investment app.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routed at `/api`)
- `pnpm --filter @workspace/mockup-sandbox run dev` — run the component-preview server at `/__mockup`
- `pnpm install --frozen-lockfile` — install workspace dependencies
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `npm run vercel-build` — Vercel build; writes static files to `.output/public`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string

The Replit API health check is available at `/api/healthz`. The current web preview is the component-preview shell, not the full Valoriza frontend.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server` — API service and build configuration
- `artifacts/mockup-sandbox` — component-preview frontend
- `lib` — shared API and database packages
- `.migration-backup/backend/migrations` — legacy Valoriza PostgreSQL schema

## Architecture decisions

- The workspace uses pnpm; install with pnpm so workspace catalogs and the lockfile stay consistent.
- The API uses the Replit development database in development. Keep development schema changes separate from the external production database.

## Product

The API supports the Valoriza investment app. The active web artifact in this workspace is a component preview rather than the complete user-facing application.

## User preferences

_No additional project-wide preferences recorded._

## Gotchas

- Vercel's static output directory must remain `.output/public`; `npm run vercel-build` sets the production Vite base path and output directory.
- Do not run the legacy migration batch unreviewed: migration `002` deletes and reseeds task and wheel-configuration rows.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
