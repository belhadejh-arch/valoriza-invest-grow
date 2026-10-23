import assert from "node:assert/strict";
import test from "node:test";

test("only an explicit credential rejection is shown as wrong credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  try {
    const { auth } = await import("./auth-client");
    const credentials = { email: "  \u061cTEST@EXAMPLE.INVALID ", password: " unchanged-test-password " };
    for (const response of [
      new Response("<html>Proxy unavailable</html>", { status: 503 }),
      new Response("<html>Proxy denied access</html>", { status: 401 }),
      Response.json({}, { status: 401 }),
      Response.json({ session: null }, { status: 502 }),
    ]) {
      globalThis.fetch = async () => response;
      const result = await auth.signInWithPassword(credentials);
      assert.equal(result.error?.message, "AUTH_UNAVAILABLE");
    }
    globalThis.fetch = async () => { throw new TypeError("network interrupted"); };
    assert.equal((await auth.signInWithPassword(credentials)).error?.message, "AUTH_UNAVAILABLE");
    globalThis.fetch = async () => Response.json({ message: "INVALID_CREDENTIALS" }, { status: 401 });
    assert.equal((await auth.signInWithPassword(credentials)).error?.message, "INVALID_CREDENTIALS");

    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls += 1;
      if (String(url).endsWith("/login")) {
        const body = JSON.parse(String(init?.body));
        assert.equal(body.email, "test@example.invalid");
        assert.equal(body.password, credentials.password);
        return Response.json({ ok: true, token: "test-only-token", user: { id: "test-user", email: body.email } });
      }
      if (String(url).endsWith("/logout")) return Response.json({ ok: true });
      return Response.json({ session: null });
    };
    assert.equal((await auth.signInWithPassword(credentials)).error, null);
    const [current, currentUser] = await Promise.all([auth.getSession(), auth.getUser()]);
    assert.equal(current.data.session?.user.id, "test-user");
    assert.equal(currentUser.data.user?.id, "test-user");
    assert.equal(calls, 1, "confirmed login should not immediately re-fetch the same session");
    await auth.signOut();
    const [anonymous, anonymousUser] = await Promise.all([auth.getSession(), auth.getUser()]);
    assert.equal(anonymous.data.session, null);
    assert.equal(anonymousUser.data.user, null);
    assert.equal(calls, 3, "logout plus one shared session request");
    assert.equal(storage.has("valoriza_session_token"), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
