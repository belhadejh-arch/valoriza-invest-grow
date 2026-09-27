-- Render cannot access the Replit App Storage credential sidecar. Store new
-- private deposit receipt images with their proof metadata in PostgreSQL.
-- Nullable so existing proofs remain intact until their files are backfilled.
ALTER TABLE deposit_proofs
  ADD COLUMN IF NOT EXISTS proof_bytes bytea;
