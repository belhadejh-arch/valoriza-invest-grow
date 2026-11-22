import assert from "node:assert/strict";
import test from "node:test";
import { createTokenStore } from "./session-token";

test("server-issued tokens remain usable when all persistent storage is blocked", () => {
  const store = createTokenStore(() => { throw new Error("SecurityError"); });
  assert.equal(store.get(), null);
  store.set("server-issued-A");
  assert.equal(store.get(), "server-issued-A");
  store.set(null);
  assert.equal(store.get(), null);
});

test("failed storage writes cannot restore a stale account or undo logout", () => {
  let old = "old-account";
  const store = createTokenStore(() => ({
    getItem: () => old,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => { throw new Error("SecurityError"); },
  }));
  assert.equal(store.get(), "old-account");
  store.set("current-account");
  assert.equal(store.get(), "current-account");
  old = "another-tab";
  assert.equal(store.get(), "current-account");
  store.set(null);
  assert.equal(store.get(), null);
});

test("working storage still follows account changes and logout from another tab", () => {
  let token: string | null = null;
  const store = createTokenStore(() => ({
    getItem: () => token,
    setItem: (_key, value) => { token = value; },
    removeItem: () => { token = null; },
  }));
  store.set("A");
  assert.equal(store.get(), "A");
  token = "B";
  assert.equal(store.get(), "B");
  token = null;
  assert.equal(store.get(), null);
});
