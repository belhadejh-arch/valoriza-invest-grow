---
name: Vercel artifact builds
description: Environment variables available to Replit artifact workflows may be absent from Vercel workspace builds.
---

Vercel builds that run the workspace's recursive build script do not inherit service environment variables configured in an artifact's Replit workflow. For Vite artifacts with required runtime values, provide build-only defaults matching the artifact manifest while keeping development-server requirements strict.

**Why:** A Vercel build of the workspace reached the mockup artifact but failed because its config required the workflow-provided `PORT`.

**How to apply:** When changing a Vite artifact config, distinguish `build` from `serve`; only use manifest-matching defaults for CI builds, and preserve explicit environment checks for runtime workflows.