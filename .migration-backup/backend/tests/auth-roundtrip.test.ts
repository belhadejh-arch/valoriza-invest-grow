import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { pool } from "../src/db.js";

// Integration test against the running development API; never customer data.
test("database credentials survive logout, legacy email collisions, and password changes", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const ids: string[] = [];
  const base = "http://127.0.0.1:80";
  const suffix = randomUUID();
  const email = `auth-roundtrip-${suffix}@example.invalid`;
  const otherEmail = `other-${email}`;
  const password = `  Aa!${randomUUID()}  `;
  const otherPassword = randomUUID();

  async function api(path: string, body?: object, headers: Record<string, string> = {}) {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  }
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  try {
    const first = await api("/api/auth/register", {
      username: `auth_${suffix.slice(0, 8)}`, email, password,
    });
    assert.equal(first.status, 201);
    ids.push(first.data.user.id);
    const originalToken = first.data.token;
    const [emailLocal, emailDomain] = email.split("@");
    await pool.query("UPDATE users SET email=$1 WHERE id=$2", [
      `${emailLocal}\u061c@${emailDomain}`,
      ids[0],
    ]);
    assert.equal((await api("/api/auth/logout", {}, bearer(originalToken))).status, 200);
    assert.equal((await api("/api/auth/session", undefined, bearer(originalToken))).data.session, null);

    const login = await api("/api/auth/login", {
      email: `\u061c\u200B ${email.toUpperCase()} \u2060`,
      password,
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.user.id, ids[0]);
    assert.notEqual(login.data.token, originalToken);
    assert.equal(login.headers.get("cache-control"), "no-store");
    const pooledSessions = await Promise.all(
      Array.from({ length: 8 }, () => api("/api/auth/session", undefined, bearer(login.data.token))),
    );
    for (const session of pooledSessions) {
      assert.equal(session.status, 200);
      assert.equal(session.data.session?.user.id, ids[0], "pooled connections must agree on the session");
    }
    assert.equal((await api("/api/auth/login", { email, password: password.trim() })).status, 401);
    assert.equal((await api("/api/auth/login", { email, password: "incorrect-password" })).status, 401);

    const staleCookie = await api("/api/auth/session", undefined, {
      ...bearer(login.data.token), Cookie: "valoriza_session=expired-cookie",
    });
    assert.equal(staleCookie.data.session.user.id, ids[0]);
    const second = await api("/api/auth/register", {
      username: `auth_b_${suffix.slice(0, 8)}`, email: otherEmail, password: otherPassword,
    });
    assert.equal(second.status, 201);
    ids.push(second.data.user.id);
    await pool.query("UPDATE users SET email=$1 WHERE id=$2", [otherEmail.toUpperCase(), ids[1]]);
    const duplicate = await api("/api/auth/register", {
      username: `duplicate_${suffix.slice(0, 8)}`, email: otherEmail, password: otherPassword,
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.data.message, "ACCOUNT_EXISTS");

    // Mimic two pre-existing case variants. Each distinct stored password
    // must select its own real account, never an arbitrary LIMIT 1 result.
    await pool.query("UPDATE users SET email=$1 WHERE id=$2", [email.toUpperCase(), ids[1]]);
    await pool.query("UPDATE profiles SET email=$1 WHERE id=$2", [email.toUpperCase(), ids[1]]);
    const legacyLogin = await api("/api/auth/login", { email, password: otherPassword });
    assert.equal(legacyLogin.status, 200);
    assert.equal(legacyLogin.data.user.id, ids[1]);
    const firstLogin = await api("/api/auth/login", { email, password });
    assert.equal(firstLogin.status, 200);
    assert.equal(firstLogin.data.user.id, ids[0]);

    const mixedTokens = await api("/api/auth/session", undefined, {
      ...bearer(firstLogin.data.token), Cookie: `valoriza_session=${legacyLogin.data.token}`,
    });
    assert.equal(mixedTokens.data.session.user.id, ids[0]);
    const cookieOnly = await api("/api/auth/session", undefined, {
      Cookie: `valoriza_session=${legacyLogin.data.token}`,
    });
    assert.equal(cookieOnly.data.session.user.id, ids[1]);
    await api("/api/auth/logout", {}, { Cookie: `valoriza_session=${legacyLogin.data.token}` });
    assert.equal((await api("/api/auth/session", undefined, bearer(legacyLogin.data.token))).data.session, null);

    await pool.query("UPDATE profiles SET is_blocked=true WHERE id=$1", [ids[1]]);
    assert.equal((await api("/api/auth/login", { email, password: otherPassword })).status, 403);
    await pool.query("UPDATE profiles SET is_blocked=false WHERE id=$1", [ids[1]]);
    await pool.query("UPDATE users SET password_hash=(SELECT password_hash FROM users WHERE id=$1) WHERE id=$2", ids);
    const ambiguous = await api("/api/auth/login", { email, password });
    assert.equal(ambiguous.status, 409);
    assert.equal(ambiguous.data.message, "ACCOUNT_EMAIL_CONFLICT");

    const nextPassword = randomUUID();
    const changed = await api("/api/auth/password", { password: nextPassword }, bearer(firstLogin.data.token));
    assert.equal(changed.status, 200);
    await api("/api/auth/logout", {}, bearer(firstLogin.data.token));
    const updatedLogin = await api("/api/auth/login", { email, password: nextPassword });
    assert.equal(updatedLogin.status, 200);
    assert.equal(updatedLogin.data.user.id, ids[0]);
    await pool.query("DELETE FROM profiles WHERE id=$1", [ids[0]]);
    const incomplete = await api("/api/auth/login", { email, password: nextPassword });
    assert.equal(incomplete.status, 503);
    assert.equal(incomplete.data.message, "AUTH_UNAVAILABLE");
  } finally {
    if (ids.length) await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [ids]);
    await pool.end();
  }
});
