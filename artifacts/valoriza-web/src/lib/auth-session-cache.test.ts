import assert from "node:assert/strict";
import test from "node:test";
import { createSessionReader } from "./auth-session-cache";

const session = (id: string) => ({ data: { session: { user: { id } } }, error: null });

test("concurrent session readers share one request and refresh after ten seconds", async () => {
  let calls = 0;
  let clock = 0;
  const reader = createSessionReader(async () => {
    calls += 1;
    return session("one");
  }, () => "token-one", () => clock);
  const [first, second] = await Promise.all([reader.read(), reader.read()]);
  assert.equal(calls, 1);
  assert.equal(first.data?.session?.user.id, "one");
  assert.equal(second.data?.session?.user.id, "one");
  await reader.read();
  assert.equal(calls, 1);
  clock += 10_001;
  await reader.read();
  assert.equal(calls, 2);
});

test("a late session response cannot restore the account used before login switched", async () => {
  let key = "old-token";
  let finish!: (value: ReturnType<typeof session>) => void;
  const reader = createSessionReader(() =>
    new Promise<ReturnType<typeof session>>((resolve) => { finish = resolve; }),
  () => key);
  const oldRequest = reader.read();
  await Promise.resolve();
  key = "new-token";
  reader.prime({ id: "new-user" });
  finish(session("old-user"));
  assert.equal((await oldRequest).data?.session?.user.id, "new-user");
  assert.equal((await reader.read()).data?.session?.user.id, "new-user");
});

test("outages are not cached and token changes cannot reuse another user's session", async () => {
  let key = "token-one";
  let calls = 0;
  const reader = createSessionReader<{ id: string }>(async () => {
    calls += 1;
    if (calls === 1) return { data: null, error: new Error("AUTH_UNAVAILABLE") };
    return session(key);
  }, () => key);
  assert.equal((await reader.read()).error?.message, "AUTH_UNAVAILABLE");
  assert.equal((await reader.read()).data?.session?.user.id, "token-one");
  key = "token-two";
  assert.equal((await reader.read()).data?.session?.user.id, "token-two");
  assert.equal(calls, 3);
  reader.clear();
  await reader.read();
  assert.equal(calls, 4);
});
