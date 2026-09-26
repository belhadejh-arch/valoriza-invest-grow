---
name: Administrator separation history
description: Why legacy administrator user rows remain after moving administration to a separate identity.
---

Keep administrator authentication and sessions independent of customer accounts. Legacy administrator customer rows must be denied access to both customer and new admin endpoints and excluded from customer-facing counts/lists, but should not be deleted casually.

**Why:** Existing financial and audit tables refer to legacy user IDs; deleting those users would cascade or detach historical records. An independent admin identity can control the platform without destroying that history.

**How to apply:** Use the separate admin identity for future administrator actions and approvals. Preserve and explicitly migrate historical references only after checking their foreign-key consequences. Do not reintroduce a bootstrap that creates an administrator wallet or promotes a customer account based on matching email.