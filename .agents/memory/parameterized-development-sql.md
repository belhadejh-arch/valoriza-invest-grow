---
name: Parameterized development SQL
description: A limitation of parameterized SQL calls during temporary fixture cleanup.
---

Use a single SQL statement per parameterized development SQL call, or use an application-managed database transaction for atomic multi-statement work.

**Why:** The development SQL callback sends parameterized queries as prepared statements, and PostgreSQL rejects multiple commands in one prepared statement. A fixture cleanup transaction submitted as one parameterized query failed without making changes; separate targeted statements succeeded.

**How to apply:** When a migration or verification needs several parameterized commands, do not concatenate them into one SQL callback request. Use separate calls, or the app's database transaction helper if all statements must be atomic.