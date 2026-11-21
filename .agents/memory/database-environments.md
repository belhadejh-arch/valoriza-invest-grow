---
name: Separate database environments
description: Which PostgreSQL database contains legacy customer investment records.
---

Legacy customer investments were stored in external PostgreSQL supplied through `POSTGRES_URL`. The user now hosts the frontend and API on Netlify. Do not assume its runtime database matches either the old Render database or the workspace database.

A connection supplied by the user as copied from Netlify matched the workspace database target, but updating its existing admin credentials did not make the published API accept them. Its relationship to the active production runtime remains unverified.

**Why:** A successful test or empty result in the development database does not establish whether production investments were settled.

**How to apply:** Keep development work separate from authorized production changes. Verify the active deployment's connection precedence and namespace, not just whether a supplied connection succeeds. Production browser API calls stay same-origin. For authorized production reconciliation, inspect the target read-only first, match rows by user-provided criteria, and use a transaction with idempotency protection for any settlement.

Do not assume `public` is the application's effective schema: the development database can contain the same table names in more than one namespace.

**Why:** Inspecting or forcing the wrong namespace can make stored accounts appear missing and can separate sessions from the users they reference.

**How to apply:** Check the application connection's effective schema and foreign-key targets before diagnosing missing accounts; do not force `public` or move existing data as a shortcut.

All connections in an application pool must retain the same configured namespace before authentication queries run.

**Why:** Mixed namespace resolution can make a known account or session appear absent, even when its password is correct. Required connection setup must complete before the client is handed to a request.

**How to apply:** Use an awaited pool lifecycle hook rather than an async connection-event listener. Keep the database's selected namespace rather than guessing a replacement. PostgreSQL metadata arrays such as `name[]` are not always decoded as JavaScript arrays by the driver; use a supported array type or JSON when consuming them.