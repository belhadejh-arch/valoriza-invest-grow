import "dotenv/config";
import { closeDb, query, withTransaction } from "./db.js";
import { hashPassword } from "./auth.js";

const adminEmail = (process.env.ADMIN_EMAIL || "admin@valoriza.com").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "ValorizaAdmin2025!";
const userEmail = (process.env.USER_EMAIL || "user@valoriza.com").trim().toLowerCase();
const userPassword = process.env.USER_PASSWORD || "ValorizaUser2025!";

if (adminPassword.length < 12 || userPassword.length < 12) {
  throw new Error("Seed passwords must be at least 12 characters");
}

const adminHash = await hashPassword(adminPassword);
const userHash = await hashPassword(userPassword);

await withTransaction(async (client) => {
  const admin = await client.query<{ id: string }>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [adminEmail, adminHash],
  );
  const user = await client.query<{ id: string }>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [userEmail, userHash],
  );
  const adminId = admin.rows[0].id;
  const userId = user.rows[0].id;

  await client.query(
    `INSERT INTO profiles (id, username, email, referral_code)
     VALUES ($1, 'admin', $2, 'ADMIN')
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [adminId, adminEmail],
  );
  await client.query(
    `INSERT INTO profiles (id, username, email, referral_code)
     VALUES ($1, 'valoriza_user', $2, 'VALORIZAUSER')
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [userId, userEmail],
  );
  await client.query(
    "INSERT INTO wallets (user_id) VALUES ($1), ($2) ON CONFLICT (user_id) DO NOTHING",
    [adminId, userId],
  );
  await client.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [adminId],
  );
  await client.query(
    `INSERT INTO admin_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [adminId],
  );
  await client.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId],
  );

  const funds = [
    ["MUMBAI", "صندوق مومباي", "MUMBAI FUND", "استثمار ذكي .. لعوائد أسرع", 3, 3.08, 5, "cyan", 1],
    [
      "NEWMEXICO",
      "صندوق نيو مكسيكو",
      "NEW MEXICO FUND",
      "فرص أكبر .. لمستقبل أكثر استقراراً",
      10,
      4.2,
      5,
      "blue",
      2,
    ],
    ["GXR", "صندوق GXR", "GXR FUND", "استثمار عالمي .. بعوائد مستقرة", 30, 6.4, 5, "gold", 3],
    ["NBL", "صندوق NBL", "NBL FUND", "نمو مستدام .. لثروتك المستقبلية", 160, 10.8, 5, "purple", 4],
  ];
  for (const fund of funds) {
    await client.query(
      `INSERT INTO investment_funds (code, name_ar, name_en, tagline_ar, duration_days, profit_percent, min_amount, accent, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (code) DO NOTHING`,
      fund,
    );
  }

  const vip = [
    [1, "VIP 1", 13, 0.5, 2, 0.25, "green"],
    [2, "VIP 2", 27, 1.2, 3, 0.4, "blue"],
    [3, "VIP 3", 61, 2.9, 4, 0.725, "purple"],
    [4, "VIP 4", 131, 6.4, 5, 1.28, "gold"],
    [5, "VIP 5", 273, 13.5, 6, 2.25, "pink"],
    [6, "VIP 6", 403, 20, 7, 2.857, "emerald"],
    [7, "VIP 7", 540, 26.85, 8, 3.356, "silver"],
  ];
  for (const plan of vip) {
    await client.query(
      `INSERT INTO vip_packages (level, name, price, daily_profit, daily_tasks, task_reward, accent)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (level) DO NOTHING`,
      plan,
    );
  }

  const settings: [string, string, string, boolean][] = [
    ["min_deposit", "10", "الحد الأدنى للإيداع بالدولار", true],
    ["min_withdrawal", "6", "الحد الأدنى للسحب بالدولار", true],
    ["withdrawal_fee_percent", "10", "نسبة رسوم السحب", true],
    ["withdrawal_start_hour", "09:00", "بداية وقت السحب", true],
    ["withdrawal_end_hour", "16:00", "نهاية وقت السحب", true],
    ["withdrawals_enabled", "true", "تفعيل السحب", true],
    ["min_investment", "5", "الحد الأدنى للاستثمار", true],
    ["daily_login_reward", "0.11", "مكافأة تسجيل الدخول اليومية", true],
    ["referral_rate_l1", "0.08", "عمولة المستوى الأول", true],
    ["referral_rate_l2", "0.04", "عمولة المستوى الثاني", true],
    ["referral_rate_l3", "0.01", "عمولة المستوى الثالث", true],
    ["daily_spins", "3", "فرص عجلة الحظ اليومية", true],
  ];
  for (const setting of settings) {
    await client.query(
      `INSERT INTO platform_settings (key, value, description_ar, is_public)
       VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING`,
      setting,
    );
  }
});

await query("DELETE FROM sessions WHERE expires_at < now()");
await closeDb();
console.log("Database seed completed without printing credentials.");
