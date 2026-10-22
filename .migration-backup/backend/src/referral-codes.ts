import type { PoolClient } from "pg";

export function normalizeReferralCode(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, "")
    .toUpperCase();
}

// Normalize stored legacy codes too, without rewriting customers' codes.
export const normalizedReferralLookupSql = `
  SELECT id FROM profiles
  WHERE upper(regexp_replace(
    referral_code,
    '[[:space:]\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]',
    '', 'g'
  )) = $1
  LIMIT 2
`;

function ownerId(rows: { id: string }[]): string | null {
  if (rows.length > 1) {
    // Never attribute a new account to an arbitrary owner of an ambiguous code.
    throw Object.assign(new Error("INVALID_REFERRAL_CODE"), { code: "INVALID_REFERRAL_CODE" });
  }
  return rows[0]?.id ?? null;
}

export async function findReferralOwner(
  client: Pick<PoolClient, "query">,
  value: string,
): Promise<string | null> {
  const code = normalizeReferralCode(value);
  if (!code) return null;

  // Preserve exact custom codes and the indexed lookup as the first choice.
  const exact = await client.query<{ id: string }>(
    "SELECT id FROM profiles WHERE referral_code = $1 LIMIT 2",
    [code],
  );
  if (exact.rows.length) return ownerId(exact.rows);

  const normalized = await client.query<{ id: string }>(normalizedReferralLookupSql, [code]);
  if (normalized.rows.length) return ownerId(normalized.rows);

  // Generated VZ codes contain eight hexadecimal characters. O is not a hex
  // character, but can be mistaken for 0 when a code is typed from a screenshot.
  // Do not apply this substitution to custom codes, or guess from a user ID.
  if (/^VZ[0-9A-FO]{8}$/.test(code) && code.includes("O")) {
    const corrected = `VZ${code.slice(2).replace(/O/g, "0")}`;
    const result = await client.query<{ id: string }>(normalizedReferralLookupSql, [corrected]);
    return ownerId(result.rows);
  }
  return null;
}
