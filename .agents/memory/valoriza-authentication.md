---
name: Valoriza authentication
description: Authentication must use the API service even when no explicit backend URL is configured.
---

In the browser, the Valoriza API is routed on the same origin under `/api`. Do not treat a missing `VITE_BACKEND_URL` as a reason to fall back to local-only login or registration, and do not create synthetic user sessions in local storage.

Every signed session JWT must include a random `jti`. The same account can sign up and immediately log in within one second; identical JWT payloads otherwise produce the same token and collide with the unique session-token hash.

Login forms must submit the browser's actual form values (for example, through `FormData`) and declare standard `autocomplete` values. Browser autofill can display credentials without updating controlled React state, causing a false invalid-credentials response. Normalize email only; never trim or otherwise modify passwords.

**Why:** The local fallback accepted credentials without creating server sessions, so signed-in users could not access authenticated app data and API failures were hidden.

**How to apply:** Keep browser sign-in and registration tied to `/api/auth/*`; show backend/network errors rather than manufacturing an account. Use the configured local API origin for server-side requests, preserve per-session JWT uniqueness, and read submitted credential values from the form itself.