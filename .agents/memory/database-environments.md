---
name: Separate database environments
description: Which PostgreSQL database contains legacy customer investment records.
---

Existing customer investments are stored in the external PostgreSQL database supplied through `POSTGRES_URL`; the Replit development database is a separate environment and may contain no customer investment history.

The production frontend is hosted on Vercel and the API/backend on Render. Vercel's frontend environment and Replit's development database are separate from the Render PostgreSQL database.

**Why:** A successful test or empty result in the development database does not establish whether production investments were settled.

**How to apply:** Keep development work on the Replit database. Production browser API calls stay same-origin: Vercel rewrites `/api/*` to the Render service, while Replit preview routes `/api/*` to its API artifact. Handle Render schema changes separately from Replit. For authorized production reconciliation, inspect the external database read-only first, match rows by user-provided criteria, and use a transaction with idempotency protection for any settlement.