---
name: Vite build versus runtime environment
description: Why CI builds must not require Replit's server-only environment variables
---

Treat Vite's build phase separately from the development and preview server phases when validating environment variables. CI providers can evaluate every workspace Vite config without supplying `PORT` or `BASE_PATH`, even though Replit's preview workflows supply both.

**Why:** An external root workspace build failed before compilation because a Vite config required `PORT` at import time; after that was fixed, the same validation in the next artifact would have failed.

**How to apply:** When changing Vite configuration, require server-specific variables only for serve/preview, preserve configured base paths where available, and verify the root build without either variable.