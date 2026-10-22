---
name: Legacy schema compatibility
description: Existing Render tables may differ from the imported baseline and need additive, data-preserving schema adjustments.
---

Render's existing PostgreSQL schema predates the imported application's baseline. Existing tables can have legacy key types or lack columns expected by newer indexes and API queries; `CREATE TABLE IF NOT EXISTS` leaves those tables unchanged.

**Why:** The deployed backend failed during startup first on a foreign-key type mismatch, then on an index that required a missing `user_id` column.

**How to apply:** Before adding indexes or relying on baseline columns, account for existing table shapes. Prefer additive, nullable changes that preserve old rows; do not infer ownership mappings or rewrite financial records without inspecting the target database and confirming the mapping.
