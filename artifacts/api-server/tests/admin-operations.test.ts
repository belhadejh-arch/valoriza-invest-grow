import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import serverless from "serverless-http";

test("admin saves the actual form payloads and receives/reviews another account's deposit", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  process.env.NETLIFY = "true";
  const nonce = randomUUID();
  // Only this test process recognizes this disposable administrator.
  process.env.ADMIN_EMAIL = `admin-test-${nonce}@example.invalid`;
  const { app } = await import("../../../.migration-backup/backend/src/server.js");
  const { pool } = await import("../../../.migration-backup/backend/src/db.js");
  const handler = serverless(app);
  const userIds: string[] = [];
  const fundId = randomUUID(), packageId = randomUUID(), wheelId = randomUUID();
  async function request(path: string, token: string, data?: object) {
    const res = await handler({
      httpMethod: data === undefined ? "GET" : "POST", path,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: data === undefined ? "" : Buffer.from(JSON.stringify(data)).toString("base64"),
      isBase64Encoded: data !== undefined,
      requestContext: { identity: { sourceIp: "127.0.0.1" } },
    }, {} as never) as { statusCode: number; body: string };
    return { status: res.statusCode, data: JSON.parse(res.body) };
  }
  try {
    const accounts: any[] = [];
    const passwords = new Map<string, string>();
    for (const [index, email] of [process.env.ADMIN_EMAIL, `member-test-${nonce}@example.invalid`].entries()) {
      const password = randomUUID();
      passwords.set(email, password);
      const result = await request("/api/auth/register", "", { username: `admintest_${index}_${nonce.slice(0, 8)}`, email, password });
      assert.equal(result.status, 201);
      accounts.push(result.data); userIds.push(result.data.user.id);
    }
    const [admin, member] = accounts;
    assert.equal((await request("/api/admin/deposits", member.token)).status, 403);

    // Four independently issued sessions for the configured administrator
    // must remain valid; signing out one device must not revoke the others.
    const adminSessions: string[] = [admin.token];
    for (let device = 1; device < 4; device += 1) {
      const login = await request("/api/auth/login", "", {
        email: process.env.ADMIN_EMAIL,
        password: passwords.get(process.env.ADMIN_EMAIL!)!,
      });
      assert.equal(login.status, 200);
      adminSessions.push(login.data.token);
    }
    for (const token of adminSessions) {
      assert.equal((await request("/api/admin/overview", token)).status, 200);
    }
    assert.equal((await request("/api/auth/logout", adminSessions[0])).status, 200);
    for (const token of adminSessions.slice(1)) {
      assert.equal((await request("/api/admin/overview", token)).status, 200);
    }
    await pool.query(`INSERT INTO investment_funds
      (id,code,name_ar,name_en,duration_days,profit_percent,min_amount,accent,is_active)
      VALUES ($1,$2,'تجريبي','Test',7,10,5,'gold',false)`, [fundId, `test-${nonce}`]);
    await pool.query(`INSERT INTO vip_packages
      (id,level,name,price,daily_profit,daily_tasks,task_reward,duration_days,accent,is_active)
      VALUES ($1,$2,'Test',10,1,3,0.3,28,'purple',false)`, [packageId, -Math.floor(Date.now() / 1000)]);
    await pool.query(`INSERT INTO lucky_wheel_configs
      (id,label_ar,prize_type,prize_value,probability,accent,is_active)
      VALUES ($1,'تجريبي','cash',0.5,0,'gold',false)`, [wheelId]);
    const saves = [
      ["/api/admin/funds/save", { id: fundId, code: `updated-${nonce}`, nameAr: "صندوق الاختبار", nameEn: "Updated", taglineAr: "", durationDays: 14, profitPercent: 12, minAmount: 10, isActive: false }],
      ["/api/admin/vip-packages/save", { id: packageId, name: "Updated", price: 15, dailyProfit: 2, dailyTasks: 4, taskReward: 0.5, isActive: false }],
      ["/api/admin/wheel/save", { id: wheelId, label: "مكافأة اختبار", prizeType: "cash", prizeValue: 0.75, probability: 0, isActive: false }],
    ] as const;
    for (const [path, body] of saves) {
      const saved = await request(path, admin.token, body);
      assert.equal(saved.status, 200, JSON.stringify(saved));
      assert.equal(saved.data.ok, true);
      assert.equal((await request(path, member.token, body)).status, 403);
      const missing = await request(path, admin.token, { ...body, id: randomUUID() });
      assert.equal(missing.status, 404);
    }
    const fund = (await request("/api/admin/funds", admin.token)).data.find((r: any) => r.id === fundId);
    assert.equal(fund.name_ar, "صندوق الاختبار"); assert.equal(fund.accent, "gold");
    assert.equal(fund.code, `updated-${nonce}`);
    assert.equal(Number(fund.profit_percent), 12); assert.equal(fund.is_active, false);
    const pkg = (await request("/api/admin/vip-packages", admin.token)).data.find((r: any) => r.id === packageId);
    assert.equal(pkg.name, "Updated"); assert.equal(pkg.duration_days, 28); assert.equal(pkg.accent, "purple");
    const wheel = (await request("/api/admin/wheel", admin.token)).data.find((r: any) => r.id === wheelId);
    assert.equal(wheel.label_ar, "مكافأة اختبار"); assert.equal(Number(wheel.prize_value), 0.75);
    assert.equal(wheel.prize_type, "cash"); assert.equal(wheel.accent, "gold");
    assert.equal((await request("/api/admin/wheel/save", admin.token, { label: "", probability: -1 })).status, 400);

    // Use only an already-configured receiving address, never invent/change one.
    const settings = (await pool.query("SELECT key,value FROM platform_settings")).rows;
    const configured = settings.find((r) => /^deposit_address_(ERC20|BEP20|TRC20)$/.test(r.key) && r.value?.trim());
    assert.ok(configured, "A receiving network must be configured for the real deposit flow");
    const amount = Math.max(10, Number(settings.find((r) => r.key === "min_deposit")?.value ?? 10));
    const deposit = await request("/api/app/deposit", member.token, {
      network: configured.key.replace("deposit_address_", "USDT-"), amount,
      screenshotUrl: "https://example.invalid/disposable-test-proof.png",
    });
    assert.equal(deposit.status, 200); assert.equal(deposit.data.ok, true);
    const list = await request("/api/admin/deposits", admin.token);
    assert.equal(list.status, 200);
    const received = list.data.find((r: any) => r.id === deposit.data.depositId);
    assert.equal(received.userId, member.user.id); assert.equal(received.status, "pending");
    const before = Number((await pool.query("SELECT balance FROM wallets WHERE user_id=$1", [member.user.id])).rows[0].balance);
    const review = { depositId: deposit.data.depositId, action: "approve" };
    assert.equal((await request("/api/admin/deposits/review", admin.token, review)).status, 200);
    assert.equal((await request("/api/admin/deposits/review", admin.token, review)).status, 409);
    const after = Number((await pool.query("SELECT balance FROM wallets WHERE user_id=$1", [member.user.id])).rows[0].balance);
    assert.equal(after - before, amount);
    assert.equal((await request("/api/admin/deposits", admin.token)).data.find((r: any) => r.id === received.id).status, "approved");
    // A missing optional profile must not hide a financial request.
    await pool.query("DELETE FROM profiles WHERE id=$1", [member.user.id]);
    assert.ok((await request("/api/admin/deposits", admin.token)).data.some((r: any) => r.id === received.id));
  } finally {
    await pool.query("DELETE FROM admin_actions WHERE admin_id=ANY($1::uuid[]) OR target_user_id=ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM deposits WHERE user_id=ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM wallet_transactions WHERE user_id=ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM investment_funds WHERE id=$1", [fundId]);
    await pool.query("DELETE FROM vip_packages WHERE id=$1", [packageId]);
    await pool.query("DELETE FROM lucky_wheel_configs WHERE id=$1", [wheelId]);
    await pool.end();
  }
});
