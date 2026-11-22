import assert from "node:assert/strict";
import test from "node:test";
import { backendRequest, getStoredToken, setStoredToken } from "./backend-client";
import { onSessionInvalidated } from "./session-token";
import { BackendRequestError } from "./request-errors";

test("protected requests keep the real session despite blocked storage and expire it safely", async () => {
  const originalFetch = globalThis.fetch;
  const descriptors = ["window", "localStorage"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("SecurityError"); },
  });
  let expired = 0;
  const unsubscribe = onSessionInvalidated(() => { expired += 1; });
  try {
    setStoredToken("server-issued-token");
    globalThis.fetch = async (_url, options) => {
      assert.equal(new Headers(options?.headers).get("authorization"), "Bearer server-issued-token");
      assert.equal(options?.cache, "no-store");
      return Response.json({ ok: true });
    };
    assert.deepEqual(await backendRequest("/api/app/home"), { ok: true });
    assert.equal(getStoredToken(), "server-issued-token");

    // A late rejection from a previous account cannot expire the new one.
    let finish!: (value: Response) => void;
    globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
    const stale = backendRequest("/api/app/account");
    setStoredToken("new-account-token");
    finish(Response.json({ message: "UNAUTHORIZED" }, { status: 401 }));
    await assert.rejects(stale, (error: BackendRequestError) => error.code === "UNAUTHORIZED");
    assert.equal(getStoredToken(), "new-account-token");
    assert.equal(expired, 0);

    // Neither a database outage nor an administrator permission denial is expiry.
    for (const [status, message] of [[503, "DATABASE_UNAVAILABLE"], [403, "FORBIDDEN"]] as const) {
      globalThis.fetch = async () => Response.json({ message }, { status });
      await assert.rejects(backendRequest("/api/app/home"));
      assert.equal(getStoredToken(), "new-account-token");
    }
    globalThis.fetch = async () => Response.json({ message: "UNAUTHORIZED" }, { status: 401 });
    await assert.rejects(backendRequest("/api/app/home"), (error: BackendRequestError) => error.code === "UNAUTHORIZED");
    assert.equal(getStoredToken(), null);
    assert.equal(expired, 1);
    await assert.rejects(backendRequest("/api/app/home"));
    assert.equal(expired, 1, "parallel rejected requests must report expiry once");

    let calls = 0;
    globalThis.fetch = async () => { calls += 1; throw new TypeError("network interrupted"); };
    await assert.rejects(backendRequest("/api/app/daily-reward", { method: "POST" }),
      (error: BackendRequestError) => error.code === "SERVICE_UNAVAILABLE");
    assert.equal(calls, 1, "financial mutations must not be automatically replayed");
  } finally {
    unsubscribe();
    setStoredToken(null);
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
