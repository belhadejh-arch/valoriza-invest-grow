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

Missing historical financial snapshots must remain unknown, not be backfilled with zero or the customer's current balance.

**Why:** Older Render transaction records may predate balance snapshots. Invented values would misrepresent financial history even when they make a schema migration easier.

**How to apply:** Upgrade old ledgers additively and preserve existing entries. New transactions must record their actual before/after balances atomically; legacy entries may retain null snapshots.

Compatibility checks must exercise the complete production SQL against a minimal legacy table, not a simplified INSERT or a fixture that already includes newer fields.

**Why:** A snapshot-only migration passed a reduced test but production subsequently failed on another missing ledger field. Fixing the first reported column alone did not cover the real write contract.

**How to apply:** Audit every field read or written by the affected flow together, exercise each flow's actual persistence path, and verify repeated migrations preserve historical records.

Daily login credits use their own dated receipts with actual before/after wallet balances as the financial audit record, alongside the reward entry. Do not reintroduce a mandatory write to the legacy cash ledger.

**Why:** The existing cash ledger can require counterparties and recorder identities and restrict types to income/expense. Supplying invented values or relaxing its constraints would corrupt unrelated financial semantics; the reward must not fail because of that ledger.

**How to apply:** Credit the wallet, persist the dated receipt and reward together, lock the wallet before checking the day's receipt, and include new receipt-backed credits in the user's financial records. Leave historical unknown snapshots null, so old ledger-backed daily rewards are not displayed twice.

Other wallet operations must also use a dedicated wallet ledger rather than the legacy cash ledger; preserve both historical cash records and their existing foreign-key relationships.

**Why:** Task rewards, administrator adjustments, and withdrawals all failed on required cash-ledger counterparty fields. Filling invented counterparties or relaxing income/expense constraints would misrepresent the old ledger's meaning.

**How to apply:** Keep each wallet mutation and its receipt/review in one database transaction, use decimal SQL arithmetic under a wallet lock, and expose old and new financial records together. New referral source links target the wallet ledger separately; never send new UUIDs through the old bigint source foreign key.
