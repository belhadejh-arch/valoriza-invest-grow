---
name: Deposit receipt reliability
description: Why receipt uploads avoid browser-signed URLs and must remain idempotent across lost responses.
---

Deposit receipts should not depend on generating browser-facing signed storage URLs when an authenticated server upload can handle these small private images. Preserve the identity of an identical receipt across fresh attempts, not only within a single in-flight request.

**Why:** The signing service produced repeated HTTP 500 errors for the user even while isolated development uploads succeeded. Merely increasing retries did not solve that dependency. A lost deposit response can also cause a customer to reselect the same image and accidentally create a second pending financial request if each upload receives a new proof identity.

**How to apply:** When changing receipt storage or submission, test both entry points with actual uploads, compare retry behavior across reloads, reject reuse with changed amount/network or reviewed status, and verify old receipt previews remain accessible to administrators. Storage failures should be explicit; no external service can guarantee uptime.