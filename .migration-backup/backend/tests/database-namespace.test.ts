import assert from "node:assert/strict";
import test from "node:test";
import type { ClientBase } from "pg";
import { createNamespaceInitializer } from "../src/database-namespace.js";

test("pool connections reuse the configured namespace rather than varying by connection", async () => {
  const initialize = createNamespaceInitializer();
  const applied: unknown[][] = [];
  let discoveries = 0;
  const client = (schemas: string[]) => ({
    async query(sql: string, params?: unknown[]) {
      if (sql.includes("current_schemas")) {
        discoveries += 1;
        return { rows: [{ schemas }] };
      }
      applied.push(params ?? []);
      return { rows: [] };
    },
  }) as unknown as ClientBase;
  await Promise.all([
    initialize(client(["configured_namespace", "public"])),
    initialize(client(["public"])),
  ]);
  assert.equal(discoveries, 1);
  assert.deepEqual(applied, [
    ['"configured_namespace", "public"'],
    ['"configured_namespace", "public"'],
  ]);
});

test("namespace discovery can recover from an initial connection failure", async () => {
  const initialize = createNamespaceInitializer();
  const failing = {
    async query() { throw new Error("connection interrupted"); },
  } as unknown as ClientBase;
  await assert.rejects(initialize(failing), /connection interrupted/);
  let selected: unknown;
  const healthy = {
    async query(sql: string, params?: unknown[]) {
      if (sql.includes("current_schemas")) return { rows: [{ schemas: ['tenant"quoted', "public"] }] };
      selected = params?.[0];
      return { rows: [] };
    },
  } as unknown as ClientBase;
  await initialize(healthy);
  assert.equal(selected, '"tenant""quoted", "public"');
});
