---
name: External GitHub deploy sync
description: How source changes reach the externally hosted Vercel frontend when the workspace's HTTPS Git push authentication fails.
---

For this externally hosted product, do not infer that a workspace edit or successful public Git fetch updates Vercel. GitHub's authorized connector can update the repository file via the GitHub Contents API when HTTPS push rejects its credentials; verify the live Vercel bundle changes afterward, then synchronize the local Git branch with the resulting remote commit.

**Why:** The workspace could read the public repository but Git push failed authentication. An authorized GitHub connection was available, and a file update through its API triggered the Vercel deployment. Until the new bundle appeared, the live site continued serving the old behavior.

**How to apply:** When a live frontend fix is explicitly requested, first validate the code and the exact remote branch/file, make the minimal authorized update, check the deployed asset rather than assuming auto-deploy, and test the live user journey. Never describe local verification as proof of an external deployment.