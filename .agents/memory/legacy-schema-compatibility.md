---
name: Legacy schema compatibility
description: Existing Render tables may differ from the imported baseline and need additive, data-preserving schema adjustments.
---

Render's existing PostgreSQL schema predates the imported application's baseline. Existing tables can have legacy key types or lack columns expected by newer indexes and API queries; `CREATE TABLE IF NOT EXISTS` leaves those tables unchanged.

**Why:** The deployed backend failed during startup first on a foreign-key type mismatch, then on an index that required a missing `user_id` column.

**How to apply:** Before adding indexes or relying on baseline columns, account for existing table shapes. Prefer additive, nullable changes that preserve old rows; do not infer ownership mappings or rewrite financial records without inspecting the target database and confirming the mapping.

Existing tables can also lack unique constraints expected by newer `ON CONFLICT (columns)` clauses. Use untargeted `ON CONFLICT DO NOTHING` where conflict suppression is appropriate across both legacy and current schemas, or add a separately validated safe migration.

**Why:** Referral registration failed against a legacy `referrals` table without the composite unique constraint defined in the new baseline.

**How to apply:** Do not assume `CREATE TABLE IF NOT EXISTS` adds missing constraints. For deployment-critical writes, make the SQL compatible with the observed legacy schema without deleting or silently rewriting existing records.
