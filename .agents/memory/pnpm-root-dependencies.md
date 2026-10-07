---
name: Vercel function type checks
description: pnpm workspace-root installs and TypeScript resolution in Vercel serverless entries.
---

When adding a dependency to the monorepo root, use explicit workspace-root handling; a plain `pnpm add` is rejected. After installation, inspect `pnpm-workspace.yaml` carefully because pnpm may rewrite formatting and remove comments while serializing the file.

In root-level Vercel serverless entries, avoid relying on TypeScript resolution of Node built-in imports such as `node:url` unless the Vercel function checker itself confirms they resolve. Replit's local compiler can see workspace types that the Vercel function checker does not; a minimal, locally typed wrapper around Node's runtime `globalThis.URL` and `globalThis.URLSearchParams` avoids that mismatch.

**Why:** The deployment pipeline reported TS2307 for `node:url` after the same import passed the local TypeScript check, while the Node runtime provides these URL APIs globally.

**How to apply:** Type-check root Vercel function entries in the same constrained environment as deployment when possible. If a root dependency is required, add it with explicit workspace-root handling, then verify only intended package and lockfile entries changed and restore unrelated workspace policy changes.
