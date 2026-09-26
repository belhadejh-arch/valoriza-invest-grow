---
name: Empty financial configuration in development
description: How to verify Valoriza financial flows without substituting invented user-facing data.
---

Fresh development databases can have the schema and required platform settings but no VIP packages, savings funds, or wheel prizes. Treat that as an empty configuration, not a cue to display reference-image values or fabricate rewards. For end-to-end tests, create clearly disposable offerings through the admin interface, exercise them with temporary users and uploaded test-only proofs, then remove the test data and stored files.

**Why:** A spin initially appeared available only because a static prize grid hid the absence of configured prizes; the server correctly refused to consume a chance. Testing with a real admin-created prize also exposed a fractional wallet-credit error that static rendering could not catch.

**How to apply:** Before testing purchases, savings investments, or wheel spins in an empty development database, inspect current configuration and create isolated test entities. Verify server responses and PostgreSQL state, then clean up. Do not seed example amounts or prizes into user-facing data to make a test pass.