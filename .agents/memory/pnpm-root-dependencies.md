---
name: pnpm root dependencies
description: Adding dependencies to the workspace root without disturbing pnpm workspace policy.
---

When adding a dependency to the monorepo root, use explicit workspace-root handling; a plain `pnpm add` is rejected. After installation, inspect `pnpm-workspace.yaml` carefully because pnpm may rewrite formatting and remove comments while serializing the file.

**Why:** Root-level deployment code may need dependencies not exposed by individual workspace packages, while the workspace file contains security policy and package overrides that must remain unchanged.

**How to apply:** Add the dependency intentionally at the workspace root, then verify that only the intended package and lockfile entries changed. Restore unrelated workspace policy or formatting changes before finishing.
