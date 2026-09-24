# Valoriza

Valoriza is an Arabic investment platform with accounts, funds, rewards, referrals, and administration.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/valoriza run dev` — run the web application
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- The imported PostgreSQL schema is in `artifacts/api-server/migrations/001_init.sql`; do not replace it with the empty Drizzle schema.
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild API bundle and Vite frontend

## Where things live

- Frontend: `artifacts/valoriza/src/`, using client-side TanStack Router and `styles.css`.
- API: `artifacts/api-server/src/legacy/` mounts the original Valoriza routes into the workspace server.
- Contract: `lib/api-spec/openapi.yaml`; team UI reads `/api/app/team`.

## Architecture decisions

- Team totals and per-level earnings derive from actual referral commissions on approved deposits.
- Referral reward percentages are stored as percentages (0–100) in `platform_settings` and require an authenticated admin to change them; the reference image's values are not seeded.
- The imported backend's old `initDatabase` helper is deliberately not invoked, because it creates default accounts and hardcoded financial values.

## Product

Registration, sign-in, account/wallet, investments, tasks, rewards, deposits and withdrawals, referral teams, and administrator management.

## User preferences

- Do not use mock data or the reference image's financial figures as real team data.
- Preserve the other existing pages and functions when changing the team experience.

## Gotchas

- The development schema was applied from the imported SQL. On a fresh database, apply `artifacts/api-server/migrations/001_init.sql` before using the API.
- No default admin account is created. Promote a verified existing account to the admin role through a trusted database operation before using the admin UI.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
