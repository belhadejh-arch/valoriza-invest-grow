---
name: Database switch compatibility
description: Verify the schema and data of the currently connected database after a connection change.
---

When the database connection changes, treat the new target as an unknown existing database. Check the exact tables, columns, and indexes required by current app routes before attributing login or page errors to credentials or frontend performance. Apply only the missing additive schema in development; never replay seed or financial-setting updates blindly onto an existing database.

**Why:** A connection change brought in existing accounts and funds, but not the later wheel and deposit-proof schema. Authentication could succeed while authenticated pages failed, making the problem look like broken login or a slow platform. Earlier checks against a different, empty development database were no longer representative. The active database also retained fractional referral percentages despite a migration already defining whole-percent values; migration source is not proof of current financial configuration.

**How to apply:** Compare app-used schema and persisted financial settings to the active target, and confirm through an authenticated request, not just a public health check. Keep production and external-database migrations separate from development changes and obtain authorization before production writes.