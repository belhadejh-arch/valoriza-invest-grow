import assert from "node:assert/strict";
import test from "node:test";
import type { PoolClient } from "pg";
import { findReferralOwner, normalizeReferralCode } from "../src/referral-codes.js";

function lookupClient(results: { id: string }[][]) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const client = {
    async query(sql: string, values: unknown[]) {
      calls.push({ sql, values });
      return { rows: results.shift() ?? [] };
    },
  } as unknown as Pick<PoolClient, "query">;
  return { client, calls };
}

test("normalizes case, pasted whitespace, bidi marks and full-width input", () => {
  assert.equal(normalizeReferralCode(" \u200Fvz12 ab34cd\u200B\n"), "VZ12AB34CD");
  assert.equal(normalizeReferralCode("ＶＺ１２ＡＢ３４ＣＤ"), "VZ12AB34CD");
});

test("registration without a code needs no owner lookup", async () => {
  const { client, calls } = lookupClient([]);
  assert.equal(await findReferralOwner(client, " \u200F "), null);
  assert.equal(calls.length, 0);
});

test("uses an exact stored referral owner", async () => {
  const { client, calls } = lookupClient([[{ id: "sponsor" }]]);
  assert.equal(await findReferralOwner(client, "vz12ab34cd"), "sponsor");
  assert.equal(calls.length, 1);
});

test("finds a legacy code with different casing or hidden whitespace", async () => {
  const { client, calls } = lookupClient([[], [{ id: "legacy-sponsor" }]]);
  assert.equal(await findReferralOwner(client, " VZ12AB34CD "), "legacy-sponsor");
  assert.equal(calls[1].values[0], "VZ12AB34CD");
});

test("resolves O/0 only for generated hexadecimal VZ codes", async () => {
  const { client, calls } = lookupClient([[], [], [{ id: "sponsor" }]]);
  assert.equal(await findReferralOwner(client, "VZ12AB34OC"), "sponsor");
  assert.equal(calls[2].values[0], "VZ12AB340C");
});

test("an exact custom O code is never redirected to another owner", async () => {
  const { client, calls } = lookupClient([[{ id: "custom-owner" }]]);
  assert.equal(await findReferralOwner(client, "VZ12AB34OC"), "custom-owner");
  assert.equal(calls.length, 1);
});

test("does not guess owners for missing or unrelated custom codes", async () => {
  const { client, calls } = lookupClient([[], []]);
  assert.equal(await findReferralOwner(client, "CUSTOM-OTHER"), null);
  assert.equal(calls.length, 2);
});

test("rejects ambiguous normalized codes instead of choosing an owner", async () => {
  const { client } = lookupClient([[], [{ id: "first" }, { id: "second" }]]);
  await assert.rejects(findReferralOwner(client, "VZ12AB34CD"), /INVALID_REFERRAL_CODE/);
});
