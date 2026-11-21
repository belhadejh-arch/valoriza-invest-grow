# Valoriza on Netlify

The web app is built as a static Vite site. The Express API runs as a Netlify Function, and the investment/team settlement work runs from a scheduled function once per minute. PostgreSQL remains an external service; Netlify does not replace the existing database.

## Requirements

- Node.js 20
- pnpm 10 (the repository pins pnpm 10.26.1)
- A publicly reachable PostgreSQL connection string with TLS enabled
- A stable `SESSION_SECRET`
- Existing production database data and schema backed up before the first production function request

## Netlify build settings

The checked-in `netlify.toml` configures these settings from the repository root:

- Build command: `pnpm run netlify:build`
- Publish directory: `.output/public`
- Functions directory: `artifacts/api-server/netlify/functions`
- API route: `/api/*` rewrites to the Express function
- SPA routes: all other paths serve `index.html`

## Environment variables

Set database and admin variables in Netlify's site environment settings with the **Functions** scope. They are not needed by the static frontend build:

- `DATABASE_URL` or `POSTGRES_URL`: the external PostgreSQL connection string. Use the provider's public/external TLS connection URL, not a private service hostname that Netlify cannot reach.
- `SESSION_SECRET`: a long, random, stable secret. Do not rotate it during routine deploys.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the existing primary-admin credentials. Never put the password in source control.
- `ADMIN_PASSWORD_SYNC=true` only when intentionally synchronizing the configured password into the existing admin account. If migrating the admin email, also set `ADMIN_PREVIOUS_EMAIL` to the current admin email for that deploy. This updates the existing account and revokes its existing sessions.
- `ADMIN_PASSWORD_RESET_CODE`: a private random value of at least 32 bytes for the one-time admin reset page at `/reset-password`. Generate it locally (for example, with `openssl rand -base64 32`) and save it in Netlify's Functions-scoped environment variables. Never put it in source control or a chat message. The code can reset only the account matching `ADMIN_EMAIL`, is consumed once, and failed attempts are temporarily rate-limited. Rotate the value in Netlify before another reset; each previously used code stays blocked.
- `DB_POOL_MAX=2`: limits each warm function instance to two database connections; use a provider-supported pooled URL if available.
- `FRONTEND_URL`: optional when the browser and API use the same Netlify origin.

Do not point the production site at the Replit development database. The development and production databases are separate.

Before using `/reset-password`, make sure `ADMIN_PASSWORD_SYNC` is unset or `false` and remove any stale `ADMIN_PREVIOUS_EMAIL`; otherwise startup password synchronization can overwrite the newly reset password. Keep the configured `ADMIN_EMAIL` aligned with the existing administrator account.

## Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run netlify:build
pnpm run netlify:dev
```

The local Netlify gateway listens on `http://localhost:8888` and proxies the Vite dev server and `/api` functions.
The checked-in Netlify CLI is pinned to a Node 20-compatible version; the monorepo filter in the scripts selects the Valoriza web app.

To validate the full site and bundle the functions locally without linking a Netlify account:

```bash
pnpm exec netlify build --offline --filter @workspace/valoriza-web
```

To connect this repository to a Netlify site and deploy:

```bash
pnpm exec netlify login
pnpm run netlify:link
pnpm run netlify:deploy
```

`netlify:deploy` creates a production deploy and runs the configured build. For a non-production preview:

```bash
pnpm exec netlify deploy --build --filter @workspace/valoriza-web
```

To run the scheduled settlement function manually during local development:

```bash
pnpm exec netlify functions:invoke settlement
```

The scheduled function runs once per minute in UTC. This replaces the current always-on investment settlement timer, so matured investments can settle up to roughly one minute later than the current 15-second polling interval.
Deposit receipt images are compressed in the browser to at most 3 MB before upload so the base64 request stays within Netlify's request-size limit.

## Cutover notes

1. Configure the Netlify environment variables before the first API request.
2. Deploy a preview and verify `/api/healthz`, sign-in, account pages, deposits, and admin review flows against a non-production database first.
3. Do not run the Netlify scheduled settlement function against production while the old Render API is still performing settlement work. After Netlify is verified and the cutover is approved, stop the old Render API service to avoid duplicate background processing.
4. Keep the database at its current provider unless a separate database migration is explicitly planned.

Netlify Functions are request-scoped serverless executions, not an always-on server. Long-running or streaming work may need a separate service even when regular API routes are hosted on Netlify.
