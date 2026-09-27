---
name: Deposit receipt reliability
description: Why receipt uploads avoid browser-signed URLs and must remain idempotent across lost responses.
---

Deposit receipts should not depend on generating browser-facing signed storage URLs when an authenticated server upload can handle these small private images. Preserve the identity of an identical receipt across fresh attempts, not only within a single in-flight request.

**Why:** The signing service produced repeated HTTP 500 errors for the user even while isolated development uploads succeeded. Merely increasing retries did not solve that dependency. A lost deposit response can also cause a customer to reselect the same image and accidentally create a second pending financial request if each upload receives a new proof identity.

The user hosts the frontend on Vercel and the backend on Render, and explicitly approved storing up-to-5-MiB private receipt bytes in the PostgreSQL database used by Render rather than provisioning another storage account. This is a deployment decision, not permission to assume Replit's development database equals Render's database.

**Why:** Replit's object-storage credential sidecar is not available inside Render, so a successful Replit upload cannot prove the deployed upload works. Saving metadata without the file makes admin review impossible; storing the bytes with the proof row eliminates that cross-provider dependency at the cost of database growth.

**How to apply:** Test both entry points with actual uploads, retry behavior across reloads, and rejection of changed amount/network or reviewed proofs. Keep older Replit-only receipts intact and plan explicit backfill if they exist; the Render process cannot read them simply because the database row has an object key. Check both deployed frontend and backend versions before declaring a live fix.