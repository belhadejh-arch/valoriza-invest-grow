---
name: Valoriza authentication
description: Authentication must use the API service even when no explicit backend URL is configured.
---

In the browser, the Valoriza API is routed on the same origin under `/api`. Do not treat a missing `VITE_BACKEND_URL` as a reason to fall back to local-only login or registration, and do not create synthetic user sessions in local storage.

Every signed session JWT must include a random `jti`. The same account can sign up and immediately log in within one second; identical JWT payloads otherwise produce the same token and collide with the unique session-token hash.

Login forms must submit the browser's actual form values (for example, through `FormData`) and declare standard `autocomplete` values. Browser autofill can display credentials without updating controlled React state, causing a false invalid-credentials response. Normalize email only; never trim or otherwise modify passwords.

**Why:** The local fallback accepted credentials without creating server sessions, so signed-in users could not access authenticated app data and API failures were hidden.

**How to apply:** Keep browser sign-in and registration tied to `/api/auth/*`; show backend/network errors rather than manufacturing an account. Use the configured local API origin for server-side requests, preserve per-session JWT uniqueness, and read submitted credential values from the form itself.

Registration must work with a valid referral code or without a code. Do not work around referral lookup failures by silently creating an account without its sponsor.

**Why:** The user repeatedly reported that valid referral codes prevented new-account registration and explicitly required registration with or without referrals.

**How to apply:** Verify both successful registration and the resulting sponsor linkage. Compilation and a successful signup response alone do not establish that referral attribution works; use disposable development accounts, not customer records.

The database is authoritative for credentials and sessions. Never convert database/network errors into “wrong password,” or let an old cookie override the bearer token selected by the browser; preserve existing account data when legacy identities collide.

**Why:** The user requires accounts to keep working after logout and login, and false credential errors were reported repeatedly.

**How to apply:** Test create → logout → login against stored hashes, password whitespace, legacy email case variants, stale cookie/bearer combinations, password changes, and rejected-session reuse using temporary development accounts.

Admin credential recovery must preserve the existing account identity, balances, and linked records. Fail when identities conflict rather than silently provisioning a replacement admin or taking over another account.

**Why:** Changing an operator email is a credential reset, not permission to create a separately funded account or detach the administrator's existing history.

**How to apply:** Require explicit operator recovery settings, update the account and profile together in a transaction, revoke prior sessions only when credentials change, and keep retries idempotent.

Only the account matching configured `ADMIN_EMAIL` is the administrator; ordinary accounts must never inherit admin access from stale role-table rows.

**Why:** The user requires one designated admin account and no administrative access for other users.

**How to apply:** Derive the authenticated admin role from the configured account, reconcile stale admin memberships when that account is present, and keep admin-only navigation/routes hidden or blocked for all other accounts.

An admin configuration mismatch must not disable otherwise valid users' access or grant privileges to an incomplete account.

**Why:** Re-provisioning after an admin email change can collide with the existing profile and stop the whole API, making ordinary sign-ins fail as well.

**How to apply:** Warn about mismatches, keep existing accounts available, require explicit recovery, and create genuinely new bootstrap accounts atomically.