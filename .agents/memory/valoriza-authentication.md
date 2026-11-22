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

New-account registration must accept a user-chosen nonempty password without minimum-length or character-composition requirements. Report invalid username/email separately, never as a password-length failure. Keep a clear technical maximum matching the password hasher to prevent silent truncation; this does not relax administrator recovery requirements.

**Why:** The user explicitly requested unrestricted password choice after registration rejected passwords longer than six characters and misleadingly blamed password length.

**How to apply:** Keep registration UI and API rules aligned, preserve the submitted password exactly, and verify signup → logout → login for simple numeric, alphabetic, Arabic, and short passwords.

The database is authoritative for credentials and sessions. Never convert database/network errors into “wrong password,” or let an old cookie override the bearer token selected by the browser; preserve existing account data when legacy identities collide.

**Why:** The user requires accounts to keep working after logout and login, and false credential errors were reported repeatedly.

**How to apply:** Test create → logout → login against stored hashes, password whitespace, legacy email case variants, stale cookie/bearer combinations, password changes, and rejected-session reuse using temporary development accounts.

An existing user with a valid session must remain recoverable if their profile row is missing; restore the profile additively without replacing the account or wallet.

**Why:** The user reported authenticated pages failing when an existing account's profile record was absent.

**How to apply:** Authenticate from the user/session records even without a profile, recreate only missing profile/wallet rows, preserve the deterministic original referral code, and restore sponsor linkage only from an existing referral record.

Admin credential recovery must preserve the existing account identity, balances, and linked records. Fail when identities conflict rather than silently provisioning a replacement admin or taking over another account.

**Why:** Changing an operator email is a credential reset, not permission to create a separately funded account or detach the administrator's existing history.

**How to apply:** Require explicit operator recovery settings, update the account and profile together in a transaction, revoke prior sessions only when credentials change, and keep retries idempotent.

The public admin reset page uses a Netlify-only reset code with at least 32 bytes of entropy. Store only its digest in the database, consume it in the same transaction as the password change, rate-limit failed attempts, and revoke existing sessions. Disable `ADMIN_PASSWORD_SYNC` before using the page so startup cannot restore an older configured password; rotate the reset code before another recovery.

**Why:** Netlify cannot send an email reset link without a configured mail provider, and a public form must not let a caller choose which account to reset.

**How to apply:** Keep the reset code in Netlify Functions environment settings, target only the configured `ADMIN_EMAIL`, and require a fresh code for each reset.

Only the account matching configured `ADMIN_EMAIL` is the administrator; ordinary accounts must never inherit admin access from stale role-table rows.

**Why:** The user requires one designated admin account and no administrative access for other users.

**How to apply:** Derive the authenticated admin role from the configured account, reconcile stale admin memberships when that account is present, and keep admin-only navigation/routes hidden or blocked for all other accounts.

An admin configuration mismatch must not disable otherwise valid users' access or grant privileges to an incomplete account.

**Why:** Re-provisioning after an admin email change can collide with the existing profile and stop the whole API, making ordinary sign-ins fail as well.

**How to apply:** Warn about mismatches, keep existing accounts available, require explicit recovery, and create genuinely new bootstrap accounts atomically.

An existing request body is not necessarily parsed JSON. Netlify's serverless adapter supplies a raw Buffer alongside a readable stream; only an already-parsed object may bypass JSON parsing.

**Why:** Skipping parsing whenever a body existed made correct credentials appear absent before database verification, so resetting stored passwords could not repair sign-in.

**How to apply:** Verify authentication through the actual serverless adapter with UTF-8 and base64 events, as well as ordinary HTTP and Vercel-preparsed objects. Preserve passwords exactly, including spaces and Unicode.

Browser persistence is not guaranteed, even after the server has accepted registration. Keep the actual server-issued credential usable for the current page when storage is denied; never replace it with a synthetic authenticated identity.

**Why:** Silently ignoring a storage failure can show a successful signup followed immediately by unauthorized protected pages. Direct API authentication tests do not exercise that browser handoff.

**How to apply:** Verify signup through the first protected account request with browser storage blocked. On a genuine session rejection, clear authenticated UI state and return to sign-in; do not expire sessions on database outages, permission denials, or late responses for a previously selected account.