import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { pool, query, withTransaction } from "./db.js";
import {
  clearSessionCookie,
  createSession,
  getAuthUser,
  hashPassword,
  requireAdmin,
  requireAuth,
  verifyPassword,
} from "./auth.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS_ORIGIN_NOT_ALLOWED"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

app.get("/health", async (_request, response) => {
  try {
    await query("SELECT 1");
    response.json({ ok: true, service: "valoriza-backend", database: "connected" });
  } catch {
    response.status(503).json({ ok: false, service: "valoriza-backend", database: "unavailable" });
  }
});

function number(value: unknown) {
  return Number(value ?? 0);
}

function settingsMap(rows: { key: string; value: string }[]) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

async function getSettings(publicOnly = false) {
  const result = await query<{ key: string; value: string }>(
    `SELECT key, value FROM platform_settings ${publicOnly ? "WHERE is_public = true" : ""}`,
  );
  return settingsMap(result.rows);
}

async function ensureUserRows(userId: string) {
  await query("INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [
    userId,
  ]);
}

async function changeBalance(
  client: import("pg").PoolClient,
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string,
) {
  const wallet = await client.query<{ balance: string }>(
    "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  const before = number(wallet.rows[0]?.balance);
  const after = before + amount;
  if (after < 0) throw Object.assign(new Error("INSUFFICIENT_BALANCE"), { status: 400 });
  await client.query(
    `UPDATE wallets SET balance = $1, total_earned = total_earned + CASE WHEN $2 > 0 AND $3 <> 'deposit' THEN $2 ELSE 0 END,
      total_deposited = total_deposited + CASE WHEN $3 = 'deposit' THEN $2 ELSE 0 END,
      total_withdrawn = total_withdrawn + CASE WHEN $3 = 'withdrawal' THEN -$2 ELSE 0 END,
      updated_at = now() WHERE user_id = $4`,
    [after, amount, type, userId],
  );
  await client.query(
    `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, type, amount, before, after, referenceId ?? null, description],
  );
  return after;
}

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const { username, email, phone, password, referralCode } = request.body ?? {};
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return response.status(400).json({ message: "INVALID_REGISTRATION" });
    }
    const emailValue = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    const result = await withTransaction(async (client) => {
      const user = await client.query<{ id: string }>(
        "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id",
        [emailValue, passwordHash],
      );
      const userId = user.rows[0].id;
      const referral =
        typeof referralCode === "string" && referralCode.trim()
          ? await client.query<{ id: string }>("SELECT id FROM profiles WHERE referral_code = $1", [
              referralCode.trim().toUpperCase(),
            ])
          : { rows: [] };
      await client.query(
        `INSERT INTO profiles (id, username, email, phone, referral_code, referred_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          userId,
          username.trim(),
          emailValue,
          phone?.trim() || null,
          `VZ${userId.slice(0, 8).toUpperCase()}`,
          referral.rows[0]?.id ?? null,
        ],
      );
      await client.query("INSERT INTO wallets (user_id) VALUES ($1)", [userId]);
      await client.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')", [userId]);
      return userId;
    });
    await createSession(result, response);
    return response.status(201).json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return response.status(409).json({ message: "ACCOUNT_EXISTS" });
    return next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const { email, password } = request.body ?? {};
    const result = await query<{ id: string; password_hash: string; is_blocked: boolean }>(
      `SELECT u.id, u.password_hash, p.is_blocked FROM users u JOIN profiles p ON p.id = u.id WHERE u.email = $1`,
      [
        String(email ?? "")
          .trim()
          .toLowerCase(),
      ],
    );
    const row = result.rows[0];
    if (!row || !(await verifyPassword(String(password ?? ""), row.password_hash))) {
      return response.status(401).json({ message: "INVALID_CREDENTIALS" });
    }
    if (row.is_blocked) return response.status(403).json({ message: "ACCOUNT_BLOCKED" });
    await createSession(row.id, response);
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", async (request, response, next) => {
  try {
    const token = request.cookies?.valoriza_session;
    if (token)
      await query("DELETE FROM sessions WHERE token_hash = encode(digest($1, 'sha256'), 'hex')", [
        token,
      ]);
    clearSessionCookie(response);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/password", async (request, response, next) => {
  try {
    const user = await requireAuth(request);
    const password = String(request.body?.password ?? "");
    if (password.length < 8) return response.status(400).json({ message: "PASSWORD_TOO_SHORT" });
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      await hashPassword(password),
      user.id,
    ]);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/session", async (request, response, next) => {
  try {
    const user = await getAuthUser(request);
    response.json({ session: user ? { user } : null });
  } catch (error) {
    next(error);
  }
});

async function userRoute(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
) {
  try {
    const user = await requireAuth(request);
    await ensureUserRows(user.id);
    (request as express.Request & { authUser: typeof user }).authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}
app.use("/api/app", userRoute);

app.get("/api/app/home", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [profile, wallet, settings, prizes, spins, daily] = await Promise.all([
      query(
        "SELECT id, username, email, vip_level, referral_code, trial_active, trial_expires_at FROM profiles WHERE id = $1",
        [user.id],
      ),
      query(
        "SELECT balance, total_earned, invested_balance, team_income FROM wallets WHERE user_id = $1",
        [user.id],
      ),
      getSettings(true),
      query(
        "SELECT id, label_ar, prize_type, prize_value, icon, accent FROM lucky_wheel_configs WHERE is_active = true ORDER BY sort_order",
      ),
      query(
        "SELECT count(*)::int AS count FROM lucky_wheel_spins WHERE user_id = $1 AND spin_date = current_date",
        [user.id],
      ),
      query(
        "SELECT id FROM daily_login_rewards WHERE user_id = $1 AND reward_date = current_date",
        [user.id],
      ),
    ]);
    response.json({
      profile: profile.rows[0],
      wallet: {
        balance: number(wallet.rows[0]?.balance),
        totalEarned: number(wallet.rows[0]?.total_earned),
        investedBalance: number(wallet.rows[0]?.invested_balance),
        teamIncome: number(wallet.rows[0]?.team_income),
      },
      settings,
      wheel: {
        prizes: prizes.rows.map((p) => ({
          id: p.id,
          label: p.label_ar,
          prizeType: p.prize_type,
          prizeValue: number(p.prize_value),
          icon: p.icon,
          accent: p.accent,
        })),
        spinsLeft: Math.max(0, number(settings.daily_spins ?? 3) - number(spins.rows[0]?.count)),
      },
      dailyReward: {
        amount: number(settings.daily_login_reward ?? 0),
        claimed: Boolean(daily.rowCount),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/daily-reward", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const settings = await getSettings();
    const amount = number(settings.daily_login_reward ?? 0.11);
    const result = await withTransaction(async (client) => {
      const inserted = await client.query(
        "INSERT INTO daily_login_rewards (user_id, reward_date, amount) VALUES ($1,current_date,$2) ON CONFLICT DO NOTHING RETURNING id",
        [user.id, amount],
      );
      if (!inserted.rowCount) return { ok: false, amount: 0 };
      await changeBalance(
        client,
        user.id,
        amount,
        "daily_login_reward",
        "مكافأة تسجيل الدخول اليومية",
      );
      await client.query(
        "INSERT INTO rewards (user_id, source, amount, description_ar) VALUES ($1,'daily_login',$2,'مكافأة تسجيل الدخول اليومية')",
        [user.id, amount],
      );
      return { ok: true, amount };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/spin", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const settings = await getSettings();
    const maxSpins = number(settings.daily_spins ?? 3);
    const result = await withTransaction(async (client) => {
      const used = await client.query(
        "SELECT count(*)::int AS count FROM lucky_wheel_spins WHERE user_id=$1 AND spin_date=current_date",
        [user.id],
      );
      if (number(used.rows[0]?.count) >= maxSpins) return { ok: false, reason: "NO_SPINS_LEFT" };
      const prizes = await client.query<{
        id: string;
        label_ar: string;
        prize_type: string;
        prize_value: string;
        icon: string | null;
        accent: string;
      }>(
        "SELECT id,label_ar,prize_type,prize_value,icon,accent FROM lucky_wheel_configs WHERE is_active=true ORDER BY sort_order",
      );
      if (!prizes.rowCount) return { ok: false, reason: "NO_PRIZES_CONFIGURED" };
      const prize = prizes.rows[Math.floor(Math.random() * prizes.rows.length)];
      await client.query(
        "INSERT INTO lucky_wheel_spins (user_id,config_id,spin_date,prize_value) VALUES ($1,$2,current_date,$3)",
        [user.id, prize.id, prize.prize_value],
      );
      if (number(prize.prize_value) > 0) {
        await changeBalance(
          client,
          user.id,
          number(prize.prize_value),
          "lucky_wheel_reward",
          "مكافأة عجلة الحظ",
        );
        await client.query(
          "INSERT INTO rewards (user_id,source,amount,description_ar) VALUES ($1,'lucky_wheel',$2,$3)",
          [user.id, number(prize.prize_value), prize.label_ar],
        );
      }
      return {
        ok: true,
        id: prize.id,
        label: prize.label_ar,
        prizeType: prize.prize_type,
        prizeValue: number(prize.prize_value),
        icon: prize.icon,
        accent: prize.accent,
        spinsLeft: maxSpins - number(used.rows[0]?.count) - 1,
      };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/account", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [profile, wallet, settings, daily] = await Promise.all([
      query(
        "SELECT username,email,phone,vip_level,referral_code,trial_active FROM profiles WHERE id = $1",
        [user.id],
      ),
      query("SELECT balance FROM wallets WHERE user_id = $1", [user.id]),
      getSettings(),
      query(
        "SELECT id FROM daily_login_rewards WHERE user_id = $1 AND reward_date = current_date",
        [user.id],
      ),
    ]);
    response.json({
      profile: profile.rows[0],
      balance: number(wallet.rows[0]?.balance),
      dailyReward: {
        amount: number(settings.daily_login_reward),
        claimed: Boolean(daily.rowCount),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/settings", async (_request, response, next) => {
  try {
    const settings = await getSettings(true);
    const links = await query(
      "SELECT id,label_ar,sublabel_ar,platform,url FROM customer_service_links WHERE is_active = true ORDER BY sort_order",
    );
    response.json({ settings, links: links.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/records", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const result = await query(
      `SELECT id, type, amount, status, description, created_at FROM transactions WHERE user_id = $1
       UNION ALL SELECT id, 'deposit' AS type, amount, status, 'طلب إيداع' AS description, created_at FROM deposits WHERE user_id = $1
       UNION ALL SELECT id, 'withdrawal' AS type, amount, status, 'طلب سحب' AS description, created_at FROM withdrawals WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 100`,
      [user.id],
    );
    response.json({
      records: result.rows.map((row) => ({
        ...row,
        amount: number(row.amount),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/investment", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [funds, investments, plans, profile, wallet] = await Promise.all([
      query("SELECT * FROM investment_funds WHERE is_active = true ORDER BY sort_order"),
      query(
        "SELECT i.*, f.code, f.name_ar, f.name_en FROM investments i JOIN investment_funds f ON f.id = i.fund_id WHERE i.user_id = $1 ORDER BY i.created_at DESC",
        [user.id],
      ),
      query("SELECT * FROM vip_packages WHERE is_active = true ORDER BY level"),
      query(
        "SELECT vip_level,trial_active,trial_started_at,trial_expires_at FROM profiles WHERE id = $1",
        [user.id],
      ),
      query("SELECT balance FROM wallets WHERE user_id = $1", [user.id]),
    ]);
    response.json({
      funds: funds.rows,
      investments: investments.rows,
      vipPackages: plans.rows,
      profile: profile.rows[0],
      walletBalance: number(wallet.rows[0]?.balance),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/trial", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const result = await query(
      `UPDATE profiles SET trial_active=true, trial_started_at=now(), trial_expires_at=now() + interval '2 days'
       WHERE id=$1 AND trial_started_at IS NULL RETURNING trial_expires_at`,
      [user.id],
    );
    response.json(
      result.rowCount
        ? { ok: true, trialExpiresAt: result.rows[0].trial_expires_at }
        : { ok: false, reason: "TRIAL_ALREADY_USED" },
    );
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/vip-plans", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [plans, profile, wallet] = await Promise.all([
      query("SELECT * FROM vip_packages WHERE is_active=true ORDER BY level"),
      query(
        "SELECT vip_level,trial_active,trial_started_at,trial_expires_at FROM profiles WHERE id=$1",
        [user.id],
      ),
      query("SELECT balance FROM wallets WHERE user_id=$1", [user.id]),
    ]);
    response.json({
      plans: plans.rows,
      userVipLevel: number(profile.rows[0]?.vip_level),
      trial: profile.rows[0],
      walletBalance: number(wallet.rows[0]?.balance),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/vip/purchase", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const level = Number(request.body?.level);
    const result = await withTransaction(async (client) => {
      const plan = await client.query<{
        id: string;
        name: string;
        price: string;
        duration_days: number;
      }>("SELECT id,name,price,duration_days FROM vip_packages WHERE level=$1 AND is_active=true", [
        level,
      ]);
      if (!plan.rowCount) return { ok: false, reason: "PACKAGE_NOT_FOUND" };
      const expires = new Date(Date.now() + plan.rows[0].duration_days * 86400000);
      await changeBalance(
        client,
        user.id,
        -number(plan.rows[0].price),
        "vip_purchase",
        `تفعيل ${plan.rows[0].name}`,
      );
      await client.query(
        "INSERT INTO user_vip (user_id,vip_package_id,expires_at) VALUES ($1,$2,$3)",
        [user.id, plan.rows[0].id, expires],
      );
      await client.query("UPDATE profiles SET vip_level=$1,vip_expires_at=$2 WHERE id=$3", [
        level,
        expires,
        user.id,
      ]);
      const wallet = await client.query("SELECT balance FROM wallets WHERE user_id=$1", [user.id]);
      return { ok: true, vipLevel: level, newBalance: number(wallet.rows[0]?.balance) };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/deposit", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { amount, screenshotUrl, txHash } = request.body ?? {};
    const network = String(request.body?.network ?? "").replace(/^USDT-/, "");
    const settings = await getSettings();
    const value = Number(amount);
    if (value < number(settings.min_deposit ?? 10))
      return response.json({ ok: false, reason: "BELOW_MIN_DEPOSIT" });
    const address = settings[`deposit_address_${network}`] ?? "";
    const result = await query(
      "INSERT INTO deposits (user_id,amount,network,deposit_address,screenshot_url,tx_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [user.id, value, String(address), String(screenshotUrl ?? ""), txHash ?? null],
    );
    response.json({ ok: true, depositId: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/about", async (_request, response, next) => {
  try {
    const [settings, links] = await Promise.all([
      getSettings(true),
      query(
        "SELECT id,label_ar,sublabel_ar,platform,url FROM customer_service_links WHERE is_active=true ORDER BY sort_order",
      ),
    ]);
    response.json({ settings, links: links.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/invest", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { fundId, amount } = request.body ?? {};
    const value = Number(amount);
    const result = await withTransaction(async (client) => {
      const fund = await client.query<{
        duration_days: number;
        profit_percent: string;
        min_amount: string;
      }>(
        "SELECT duration_days,profit_percent,min_amount FROM investment_funds WHERE id=$1 AND is_active=true",
        [fundId],
      );
      if (!fund.rows[0] || value < number(fund.rows[0].min_amount))
        return { ok: false, reason: "BELOW_MIN_INVESTMENT" };
      const matures = new Date(Date.now() + fund.rows[0].duration_days * 86400000);
      const expected = (value * number(fund.rows[0].profit_percent)) / 100;
      const investment = await client.query<{ id: string }>(
        "INSERT INTO investments (user_id,fund_id,amount,expected_profit,matures_at) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [user.id, fundId, value, expected, matures],
      );
      const newBalance = await changeBalance(
        client,
        user.id,
        -value,
        "investment",
        "شراء استثمار",
        investment.rows[0].id,
      );
      await client.query(
        "UPDATE wallets SET invested_balance = invested_balance + $1 WHERE user_id = $2",
        [value, user.id],
      );
      return { ok: true, investmentId: investment.rows[0].id, newBalance };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/withdrawal", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [wallet, address, settings] = await Promise.all([
      query("SELECT balance FROM wallets WHERE user_id = $1", [user.id]),
      query("SELECT network,address,locked FROM withdrawal_addresses WHERE user_id = $1", [
        user.id,
      ]),
      getSettings(true),
    ]);
    response.json({
      balance: number(wallet.rows[0]?.balance),
      boundAddress: address.rows[0] ?? null,
      settings: {
        minWithdrawal: number(settings.min_withdrawal ?? 6),
        feePercent: number(settings.withdrawal_fee_percent ?? 10),
        startHour: settings.withdrawal_start_hour ?? "09:00",
        endHour: settings.withdrawal_end_hour ?? "16:00",
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/withdrawal/address", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { network, address } = request.body ?? {};
    const current = await query<{ locked: boolean }>(
      "SELECT locked FROM withdrawal_addresses WHERE user_id=$1",
      [user.id],
    );
    if (current.rows[0]?.locked)
      return response.json({
        ok: false,
        reason: "ADDRESS_LOCKED",
        message: "عنوان السحب مقفل ومحمي بحسابك.",
      });
    await query(
      `INSERT INTO withdrawal_addresses (user_id,network,address,locked) VALUES ($1,$2,$3,true)
      ON CONFLICT (user_id) DO UPDATE SET network=EXCLUDED.network,address=EXCLUDED.address,locked=true`,
      [user.id, network, String(address).trim()],
    );
    response.json({ ok: true, address: String(address).trim(), network });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/withdrawal", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { network, address, amount } = request.body ?? {};
    const value = Number(amount);
    const settings = await getSettings();
    const minimum = number(settings.min_withdrawal ?? 6);
    if (value < minimum)
      return response.json({ ok: false, reason: "BELOW_MIN_WITHDRAWAL", minWithdrawal: minimum });
    const fee = Math.round(value * number(settings.withdrawal_fee_percent ?? 10)) / 100;
    const result = await withTransaction(async (client) => {
      const locked = await client.query<{ address: string; network: string }>(
        "SELECT address,network FROM withdrawal_addresses WHERE user_id=$1",
        [user.id],
      );
      if (
        locked.rows[0] &&
        (locked.rows[0].address !== String(address).trim() || locked.rows[0].network !== network)
      )
        return {
          ok: false,
          reason: "ADDRESS_MISMATCH",
          message: "العنوان لا يطابق العنوان المقفل.",
        };
      const withdrawal = await client.query<{ id: string }>(
        "INSERT INTO withdrawals (user_id,amount,fee,net_amount,network,address) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [user.id, value, fee, value - fee, network, String(address).trim()],
      );
      await changeBalance(client, user.id, -value, "withdrawal", "طلب سحب", withdrawal.rows[0].id);
      return { ok: true, withdrawalId: withdrawal.rows[0].id, netAmount: value - fee, fee };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/tasks", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [tasks, completions, profile, wallet, plans] = await Promise.all([
      query("SELECT * FROM tasks WHERE is_active=true ORDER BY sort_order"),
      query(
        "SELECT task_id FROM task_completions WHERE user_id=$1 AND completion_date=current_date",
        [user.id],
      ),
      query("SELECT vip_level,trial_active,trial_expires_at FROM profiles WHERE id=$1", [user.id]),
      query("SELECT balance FROM wallets WHERE user_id=$1", [user.id]),
      query("SELECT * FROM vip_packages WHERE level=(SELECT vip_level FROM profiles WHERE id=$1)", [
        user.id,
      ]),
    ]);
    const completed = new Set(completions.rows.map((row) => row.task_id));
    const plan = plans.rows[0];
    const vipLevel = number(profile.rows[0]?.vip_level);
    const reward = vipLevel ? number(plan?.task_reward) : profile.rows[0]?.trial_active ? 0.5 : 0;
    const limit = vipLevel ? number(plan?.daily_tasks) : profile.rows[0]?.trial_active ? 3 : 0;
    response.json({
      vipLevel,
      vipName: vipLevel
        ? `VIP ${vipLevel}`
        : profile.rows[0]?.trial_active
          ? "الفترة التجريبية"
          : "VIP",
      isTrial: Boolean(profile.rows[0]?.trial_active),
      trialExpiresAt: profile.rows[0]?.trial_expires_at,
      videoCommission: reward,
      dailyLimit: limit,
      completedCount: completed.size,
      remainingTasks: Math.max(0, limit - completed.size),
      videoDuration: 10,
      userBalance: number(wallet.rows[0]?.balance),
      allDailyTasksCompleted: completed.size >= limit,
      tasks: tasks.rows.map((task) => ({
        id: task.id,
        taskNumber: task.task_number,
        title: task.title,
        description: task.description,
        youtubeId: task.youtube_id,
        videoUrl: `https://www.youtube.com/embed/${task.youtube_id}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${task.youtube_id}/hqdefault.jpg`,
        durationSeconds: task.duration_seconds,
        vipRequirement: vipLevel ? `VIP ${vipLevel}` : "الفترة التجريبية",
        reward,
        isCompletedToday: completed.has(task.id),
        status: completed.has(task.id)
          ? "REWARDED"
          : completed.size >= limit
            ? "LOCKED"
            : "AVAILABLE",
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/tasks/complete", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { taskId, watchedSeconds } = request.body ?? {};
    const result = await withTransaction(async (client) => {
      const task = await client.query("SELECT id FROM tasks WHERE id=$1 AND is_active=true", [
        taskId,
      ]);
      if (!task.rowCount) return { ok: false, reason: "TASK_NOT_FOUND" };
      const profile = await client.query<{ vip_level: number; trial_active: boolean }>(
        "SELECT vip_level,trial_active FROM profiles WHERE id=$1",
        [user.id],
      );
      const plan = await client.query<{ task_reward: string; daily_tasks: number }>(
        "SELECT task_reward,daily_tasks FROM vip_packages WHERE level=$1",
        [profile.rows[0]?.vip_level ?? 0],
      );
      const reward = number(plan.rows[0]?.task_reward) || (profile.rows[0]?.trial_active ? 0.5 : 0);
      const limit = number(plan.rows[0]?.daily_tasks) || (profile.rows[0]?.trial_active ? 3 : 0);
      const count = await client.query(
        "SELECT count(*)::int AS count FROM task_completions WHERE user_id=$1 AND completion_date=current_date",
        [user.id],
      );
      if (number(count.rows[0]?.count) >= limit)
        return { ok: false, reason: "DAILY_LIMIT_REACHED" };
      const inserted = await client.query<{ id: string }>(
        "INSERT INTO task_completions (user_id,task_id,completion_date,started_at,completed_at,reward,watched_seconds) VALUES ($1,$2,current_date,now(),now(),$3,$4) ON CONFLICT DO NOTHING RETURNING id",
        [user.id, taskId, reward, Number(watchedSeconds) || 0],
      );
      if (!inserted.rowCount) return { ok: false, reason: "ALREADY_COMPLETED_TODAY" };
      await changeBalance(
        client,
        user.id,
        reward,
        "task_reward",
        "مكافأة المهمة",
        inserted.rows[0].id,
      );
      await client.query(
        "INSERT INTO rewards (user_id,source,amount,description_ar,reference_id) VALUES ($1,'task',$2,'مكافأة مشاهدة المهمة',$3)",
        [user.id, reward, inserted.rows[0].id],
      );
      return { ok: true, reward };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/rewards", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const result = await query(
      "SELECT id,source,amount,description_ar,created_at FROM rewards WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
      [user.id],
    );
    const wallet = await query("SELECT balance,total_earned FROM wallets WHERE user_id=$1", [
      user.id,
    ]);
    response.json({
      rewards: result.rows.map((row) => ({
        id: row.id,
        source: row.source,
        amount: number(row.amount),
        description: row.description_ar,
        createdAt: row.created_at,
      })),
      balance: number(wallet.rows[0]?.balance),
      totalEarned: number(wallet.rows[0]?.total_earned),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/team", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const profile = await query(
      "SELECT id,username,email,referral_code FROM profiles WHERE id=$1",
      [user.id],
    );
    const referrals = await query(
      "SELECT p.username,p.email,p.created_at,r.level FROM referrals r JOIN profiles p ON p.id=r.referred_id WHERE r.referrer_id=$1 ORDER BY r.created_at DESC",
      [user.id],
    );
    const wallet = await query("SELECT team_income FROM wallets WHERE user_id=$1", [user.id]);
    response.json({
      profile: profile.rows[0],
      members: referrals.rows,
      teamIncome: number(wallet.rows[0]?.team_income),
      commissions: [],
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/notifications", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const result = await query(
      "SELECT id,title_ar,body_ar,link,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
      [user.id],
    );
    response.json({
      notifications: result.rows.map((row) => ({
        id: row.id,
        userId: user.id,
        title: row.title_ar,
        body: row.body_ar,
        relatedPage: row.link,
        isRead: row.is_read,
        createdAt: row.created_at,
      })),
      unreadCount: result.rows.filter((row) => !row.is_read).length,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/app/notifications/read", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    if (request.body?.markAll)
      await query("UPDATE notifications SET is_read=true WHERE user_id=$1", [user.id]);
    else
      await query("UPDATE notifications SET is_read=true WHERE user_id=$1 AND id=$2", [
        user.id,
        request.body?.notificationId,
      ]);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use("/api/admin", async (request, _response, next) => {
  try {
    const user = await requireAdmin(request);
    (request as express.Request & { authUser: typeof user }).authUser = user;
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/overview", async (request, response, next) => {
  try {
    await requireAdmin(request);
    const [users, deposits, withdrawals, investments, tasks] = await Promise.all([
      query("SELECT count(*)::int AS count FROM users"),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM deposits WHERE status='pending'",
      ),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM withdrawals WHERE status='pending'",
      ),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM investments WHERE status='active'",
      ),
      query("SELECT count(*)::int AS count FROM task_completions"),
    ]);
    response.json({
      usersCount: number(users.rows[0]?.count),
      pendingDepositsCount: number(deposits.rows[0]?.count),
      pendingDepositsAmount: number(deposits.rows[0]?.amount),
      pendingWithdrawalsCount: number(withdrawals.rows[0]?.count),
      pendingWithdrawalsAmount: number(withdrawals.rows[0]?.amount),
      activeInvestmentsCount: number(investments.rows[0]?.count),
      activeInvestmentsVolume: number(investments.rows[0]?.amount),
      taskCompletionsCount: number(tasks.rows[0]?.count),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users", async (_request, response, next) => {
  try {
    const result = await query(
      `SELECT p.id,p.username,p.email,p.phone,p.referral_code,p.vip_level,p.trial_active,p.is_blocked,p.created_at,
        w.balance,w.total_deposited,w.total_withdrawn,w.invested_balance,w.team_income,
        (SELECT count(*)::int FROM referrals r WHERE r.referrer_id=p.id) AS team_count
       FROM profiles p LEFT JOIN wallets w ON w.user_id=p.id ORDER BY p.created_at DESC LIMIT 100`,
    );
    response.json(
      result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        referralCode: row.referral_code,
        vipLevel: row.vip_level,
        trialActive: row.trial_active,
        isBlocked: row.is_blocked,
        createdAt: row.created_at,
        balance: number(row.balance),
        totalDeposited: number(row.total_deposited),
        totalWithdrawn: number(row.total_withdrawn),
        investedBalance: number(row.invested_balance),
        teamIncome: number(row.team_income),
        teamCount: number(row.team_count),
      })),
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/block", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const isBlocked = Boolean(request.body?.isBlocked ?? request.body?.blocked);
    await query("UPDATE profiles SET is_blocked=$1, updated_at=now() WHERE id=$2", [
      isBlocked,
      request.body?.userId,
    ]);
    await query(
      "INSERT INTO admin_actions (admin_id,action,target_user_id,details) VALUES ($1,$2,$3,$4)",
      [
        admin.id,
        isBlocked ? "BLOCK_USER" : "UNBLOCK_USER",
        request.body?.userId,
        JSON.stringify({ isBlocked }),
      ],
    );
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/vip", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const targetUserId = request.body?.targetUserId;
    const vipLevel = Number(request.body?.vipLevel);
    await query("UPDATE profiles SET vip_level=$1, updated_at=now() WHERE id=$2", [
      vipLevel,
      targetUserId,
    ]);
    await query(
      "INSERT INTO notifications (user_id,title_ar,body_ar) VALUES ($1,'ترقية مستوى VIP',$2)",
      [targetUserId, `تم تحديث رتبتك إلى VIP ${vipLevel} من قبل إدارة المنصة.`],
    );
    await query(
      "INSERT INTO admin_actions (admin_id,action,target_user_id,details) VALUES ($1,'SET_VIP_LEVEL',$2,$3)",
      [admin.id, targetUserId, JSON.stringify({ vipLevel })],
    );
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/balance", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const targetUserId = request.body?.targetUserId;
    const amount = Number(request.body?.amount);
    const reason = String(request.body?.reason ?? "تعديل إداري");
    const result = await withTransaction(async (client) => {
      const balance = await changeBalance(
        client,
        targetUserId,
        amount,
        "admin_adjustment",
        reason,
      );
      await client.query(
        "INSERT INTO admin_actions (admin_id,action,target_user_id,details) VALUES ($1,'ADJUST_BALANCE',$2,$3)",
        [admin.id, targetUserId, JSON.stringify({ amount, reason })],
      );
      return { ok: true, balance };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/deposits", async (_request, response, next) => {
  try {
    const result = await query(
      `SELECT d.*,p.username,p.email FROM deposits d JOIN profiles p ON p.id=d.user_id
       ORDER BY d.created_at DESC LIMIT 150`,
    );
    response.json(
      result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        amount: number(row.amount),
        network: row.network,
        depositAddress: row.deposit_address,
        screenshotUrl: row.screenshot_url,
        txHash: row.tx_hash,
        status: row.status,
        rejectReason: row.reject_reason,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
      })),
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/deposits/review", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const { depositId, action, rejectReason } = request.body ?? {};
    const result = await withTransaction(async (client) => {
      const deposit = await client.query<{
        id: string;
        user_id: string;
        amount: string;
        status: string;
      }>("SELECT id,user_id,amount,status FROM deposits WHERE id=$1 FOR UPDATE", [depositId]);
      if (!deposit.rowCount)
        throw Object.assign(new Error("DEPOSIT_NOT_FOUND"), { status: 404 });
      if (deposit.rows[0].status !== "pending")
        throw Object.assign(new Error("ALREADY_PROCESSED"), { status: 409 });
      const status = action === "approve" ? "approved" : "rejected";
      if (status === "approved") {
        await changeBalance(
          client,
          deposit.rows[0].user_id,
          number(deposit.rows[0].amount),
          "deposit",
          "اعتماد طلب الإيداع",
          depositId,
        );
      }
      await client.query(
        "UPDATE deposits SET status=$1,reject_reason=$2,reviewed_at=now(),reviewed_by=$3 WHERE id=$4",
        [status, rejectReason ?? null, admin.id, depositId],
      );
      await client.query(
        "INSERT INTO admin_actions (admin_id,action,target_user_id,details) VALUES ($1,$2,$3,$4)",
        [
          admin.id,
          status === "approved" ? "APPROVE_DEPOSIT" : "REJECT_DEPOSIT",
          deposit.rows[0].user_id,
          JSON.stringify({ depositId, rejectReason }),
        ],
      );
      return { ok: true };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/withdrawals", async (_request, response, next) => {
  try {
    const result = await query(
      `SELECT w.*,p.username,p.email FROM withdrawals w JOIN profiles p ON p.id=w.user_id
       ORDER BY w.created_at DESC LIMIT 150`,
    );
    response.json(
      result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        network: row.network,
        address: row.address,
        amount: number(row.amount),
        fee: number(row.fee),
        netAmount: number(row.net_amount),
        status: row.status,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
      })),
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/withdrawals/review", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const { withdrawalId, action, rejectReason } = request.body ?? {};
    const result = await withTransaction(async (client) => {
      const withdrawal = await client.query<{
        id: string;
        user_id: string;
        amount: string;
        status: string;
      }>("SELECT id,user_id,amount,status FROM withdrawals WHERE id=$1 FOR UPDATE", [
        withdrawalId,
      ]);
      if (!withdrawal.rowCount)
        throw Object.assign(new Error("WITHDRAWAL_NOT_FOUND"), { status: 404 });
      if (withdrawal.rows[0].status !== "pending")
        throw Object.assign(new Error("ALREADY_PROCESSED"), { status: 409 });
      if (action === "reject") {
        await changeBalance(
          client,
          withdrawal.rows[0].user_id,
          number(withdrawal.rows[0].amount),
          "withdrawal_refund",
          "استرجاع طلب سحب مرفوض",
          withdrawalId,
        );
      }
      await client.query(
        "UPDATE withdrawals SET status=$1,reject_reason=$2,reviewed_at=now(),reviewed_by=$3 WHERE id=$4",
        [action === "approve" ? "approved" : "rejected", rejectReason ?? null, admin.id, withdrawalId],
      );
      await client.query(
        "INSERT INTO admin_actions (admin_id,action,target_user_id,details) VALUES ($1,$2,$3,$4)",
        [
          admin.id,
          action === "approve" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
          withdrawal.rows[0].user_id,
          JSON.stringify({ withdrawalId, rejectReason }),
        ],
      );
      return { ok: true };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/funds", async (_request, response, next) => {
  try {
    response.json((await query("SELECT * FROM investment_funds ORDER BY sort_order")).rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/funds/save", async (request, response, next) => {
  try {
    const data = request.body ?? {};
    const nameAr = data.nameAr ?? data.name_ar;
    const nameEn = data.nameEn ?? data.name_en;
    const taglineAr = data.taglineAr ?? data.tagline_ar;
    const durationDays = data.durationDays ?? data.duration_days;
    const profitPercent = data.profitPercent ?? data.profit_percent;
    const minAmount = data.minAmount ?? data.min_amount ?? 5;
    if (data.id) {
      await query(
        "UPDATE investment_funds SET name_ar=$1,name_en=$2,tagline_ar=$3,duration_days=$4,profit_percent=$5,min_amount=$6,accent=$7,is_active=$8 WHERE id=$9",
        [
          nameAr,
          nameEn,
          taglineAr,
          durationDays,
          profitPercent,
          minAmount,
          data.accent,
          data.isActive ?? data.is_active ?? true,
          data.id,
        ],
      );
    } else {
      await query(
        "INSERT INTO investment_funds (code,name_ar,name_en,tagline_ar,duration_days,profit_percent,min_amount,accent,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,99)",
        [
          data.code,
          nameAr,
          nameEn,
          taglineAr,
          durationDays,
          profitPercent,
          minAmount,
          data.accent ?? "blue",
        ],
      );
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/vip-packages", async (_request, response, next) => {
  try {
    response.json((await query("SELECT * FROM vip_packages ORDER BY level")).rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/vip-packages/save", async (request, response, next) => {
  try {
    const data = request.body ?? {};
    await query(
      "UPDATE vip_packages SET name=$1,price=$2,daily_profit=$3,daily_tasks=$4,task_reward=$5,duration_days=$6,accent=$7,is_active=$8 WHERE id=$9",
      [
        data.name,
        data.price,
        data.dailyProfit ?? data.daily_profit,
        data.dailyTasks ?? data.daily_tasks,
        data.taskReward ?? data.task_reward,
        data.durationDays ?? data.duration_days ?? 365,
        data.accent,
        data.isActive ?? data.is_active ?? true,
        data.id,
      ],
    );
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/tasks", async (_request, response, next) => {
  try {
    response.json((await query("SELECT * FROM tasks ORDER BY sort_order")).rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/tasks/save", async (request, response, next) => {
  try {
    const data = request.body ?? {};
    const taskNumber = data.taskNumber ?? data.task_number;
    const youtubeId = data.youtubeId ?? data.youtube_id;
    const durationSeconds = data.durationSeconds ?? data.duration_seconds ?? 10;
    const sortOrder = data.sortOrder ?? data.sort_order ?? 0;
    const isActive = data.isActive ?? data.is_active ?? true;
    if (data.id) {
      await query(
        "UPDATE tasks SET task_number=$1,title=$2,description=$3,youtube_id=$4,duration_seconds=$5,sort_order=$6,is_active=$7 WHERE id=$8",
        [taskNumber, data.title, data.description, youtubeId, durationSeconds, sortOrder, isActive, data.id],
      );
    } else {
      await query(
        "INSERT INTO tasks (task_number,title,description,youtube_id,duration_seconds,sort_order) VALUES ($1,$2,$3,$4,$5,$6)",
        [taskNumber, data.title, data.description, youtubeId, durationSeconds, sortOrder],
      );
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/tasks/status", async (request, response, next) => {
  try {
    await query("UPDATE tasks SET is_active=$1 WHERE id=$2", [
      request.body?.isActive ?? request.body?.is_active,
      request.body?.taskId,
    ]);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/wheel", async (_request, response, next) => {
  try {
    response.json((await query("SELECT * FROM lucky_wheel_configs ORDER BY sort_order")).rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/wheel/save", async (request, response, next) => {
  try {
    const data = request.body ?? {};
    const label = data.label ?? data.label_ar;
    const prizeType = data.prizeType ?? data.prize_type;
    const prizeValue = data.prizeValue ?? data.prize_value ?? 0;
    const isActive = data.isActive ?? data.is_active ?? true;
    if (data.id) {
      await query(
        "UPDATE lucky_wheel_configs SET label_ar=$1,prize_type=$2,prize_value=$3,probability=$4,icon=$5,accent=$6,is_active=$7 WHERE id=$8",
        [label, prizeType, prizeValue, data.probability ?? 0, data.icon ?? null, data.accent ?? "blue", isActive, data.id],
      );
    } else {
      await query(
        "INSERT INTO lucky_wheel_configs (label_ar,prize_type,prize_value,probability,icon,accent,sort_order) VALUES ($1,$2,$3,$4,$5,$6,99)",
        [label, prizeType, prizeValue, data.probability ?? 0, data.icon ?? null, data.accent ?? "blue"],
      );
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/settings", async (_request, response, next) => {
  try {
    response.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/settings/save", async (request, response, next) => {
  try {
    const settings = request.body?.settings ?? request.body ?? {};
    for (const [key, value] of Object.entries(settings)) {
      await query(
        "INSERT INTO platform_settings (key,value,is_public) VALUES ($1,$2,true) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
        [key, String(value)],
      );
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/notifications", async (request, response, next) => {
  try {
    const data = request.body ?? {};
    const result = await query(
      "INSERT INTO notifications (user_id,title_ar,body_ar,link) SELECT id,$1,$2,$3 FROM users",
      [data.title, data.message, data.actionUrl ?? null],
    );
    response.json({ ok: true, sentCount: result.rowCount ?? 0 });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/audit-logs", async (_request, response, next) => {
  try {
    const result = await query(
      "SELECT a.id,a.action,a.target_user_id,a.details,a.created_at,u.email AS admin_email FROM admin_actions a JOIN users u ON u.id=a.admin_id ORDER BY a.created_at DESC LIMIT 100",
    );
    response.json(
      result.rows.map((row) => ({
        ...row,
        target_table: "users",
        target_id: row.target_user_id,
      })),
    );
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = Number((error as { status?: number }).status ?? 500);
    if (status >= 500) console.error(error);
    response
      .status(status)
      .json({ message: error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR" });
  },
);

const server = createServer(app);
server.listen(port, "0.0.0.0", () => console.log(`Valoriza backend listening on ${port}`));

async function shutdown() {
  server.close();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
