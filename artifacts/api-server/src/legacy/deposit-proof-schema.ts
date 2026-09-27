import { withTransaction } from "./db.js";

// Only the receipt-specific schema is prepared at startup. Existing databases
// on Render may predate the proof migration, whereas other migrations remain
// deliberate, manually applied changes.
export async function prepareDepositProofSchema() {
  await withTransaction(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS deposit_proofs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        object_key text NOT NULL UNIQUE,
        content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
        file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
        created_at timestamptz NOT NULL DEFAULT now(),
        proof_bytes bytea
      )
    `);
    await client.query("ALTER TABLE deposit_proofs ADD COLUMN IF NOT EXISTS proof_bytes bytea");
    await client.query("ALTER TABLE deposits ADD COLUMN IF NOT EXISTS proof_id uuid REFERENCES deposit_proofs(id)");
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS deposits_proof_id_unique ON deposits(proof_id) WHERE proof_id IS NOT NULL",
    );
  });
}