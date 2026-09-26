---
name: Deposit proof upload timing
description: Keep client request deadlines compatible with the object-storage signer and proof verification.
---

For deposit receipts, allow the browser more time than the server's bounded signing retries and proof-verification requests; retry only transient signer failures, not invalid configuration or rejected files.

**Why:** A short generic browser timeout can abort a valid upload or deposit request while object storage is still responding, and transient signing failures otherwise surface as an unexplained deposit error.

**How to apply:** When changing receipt storage, signing, or verification, review the browser and server deadlines together and test both entry points (home modal and account deposit page) with a disposable pending deposit.