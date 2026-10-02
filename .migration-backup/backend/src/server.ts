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
const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes(".run.app")
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive CORS for cross-deployment compatibility
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

app.get("/api/health", async (_request, response) => {
  try {
    await query("SELECT 1");
    response.json({ ok: true, service: "valoriza-backend", database: "connected" });
  } catch {
    response.status(503).json({ ok: false, service: "valoriza-backend", database: "unavailable" });
  }
});

app.get("/api/healthz", async (_request, response) => {
  try {
    await query("SELECT 1");
    response.json({ ok: true, service: "valoriza-backend", database: "connected" });
  } catch {
    response.status(503).json({ ok: false, service: "valoriza-backend", database: "unavailable" });
  }
});

app.get("/api/ping", (_request, response) => {
  response.json({ ok: true, time: new Date().toISOString() });
});

function number(value: unknown) {
  return Number(value ?? 0);
}

type MaturedInvestment = {
  id: string;
  user_id: string;
  amount: string;
  expected_profit: string;
};

/**
 * Pays due savings investments atomically. The maturity timestamp is derived
 * against the PostgreSQL-generated matures_at value. New investments calculate
 * that timestamp from PostgreSQL's statement_timestamp(), never the client clock.
 */
export async function settleMaturedInvestments(batchSize = 100): Promise<number> {
  return withTransaction(async (client) => {
    const due = await client.query<MaturedInvestment>(
      `SELECT id, user_id, amount::text, expected_profit::text
       FROM investments
       WHERE status = 'active'
         AND settled_at IS NULL
         AND matures_at <= statement_timestamp()
       ORDER BY user_id, created_at, id
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize],
    );

    let settled = 0;
    for (const investment of due.rows) {
      // Legacy recovery: if a return ledger row already exists, never credit it
      // again. This also repairs its completion status without another payout.
      const priorReturn = await client.query(
        "SELECT id FROM transactions WHERE type='investment_return' AND reference_id=$1 LIMIT 1",
        [investment.id],
      );
      if (priorReturn.rowCount) {
        await client.query(
          `UPDATE investments
           SET status='completed', settled_at=COALESCE(settled_at, statement_timestamp())
           WHERE id=$1 AND status='active' AND settled_at IS NULL`,
          [investment.id],
        );
        continue;
      }

      await client.query(
        "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [investment.user_id],
      );
      const wallet = await client.query<{
        balance_before: string;
        balance_after: string;
      }>(
        `SELECT balance::text AS balance_before,
                (balance + $2::numeric + $3::numeric)::text AS balance_after
         FROM wallets WHERE user_id=$1 FOR UPDATE`,
        [investment.user_id, investment.amount, investment.expected_profit],
      );
      if (!wallet.rowCount) throw new Error(`WALLET_NOT_FOUND_FOR_INVESTMENT:${investment.id}`);

      const transaction = await client.query(
        `INSERT INTO transactions
           (user_id,type,status,amount,balance_before,balance_after,reference_id,description)
         VALUES ($1,'investment_return','completed',$2::numeric+$3::numeric,$4::numeric,$5::numeric,$6,$7)
         ON CONFLICT (reference_id) WHERE type='investment_return' DO NOTHING
         RETURNING id`,
        [
          investment.user_id,
          investment.amount,
          investment.expected_profit,
          wallet.rows[0].balance_before,
          wallet.rows[0].balance_after,
          investment.id,
          `استحقاق صندوق التوفير — رأس المال ${investment.amount} + الربح ${investment.expected_profit}`,
        ],
      );
      if (!transaction.rowCount) {
        throw new Error(`DUPLICATE_INVESTMENT_RETURN_BLOCKED:${investment.id}`);
      }

      await client.query(
        `UPDATE wallets
         SET balance = balance + $2::numeric + $3::numeric,
             total_earned = total_earned + $3::numeric,
             invested_balance = GREATEST(0, invested_balance - $2::numeric),
             updated_at = statement_timestamp()
         WHERE user_id=$1`,
        [investment.user_id, investment.amount, investment.expected_profit],
      );
      const completed = await client.query(
        `UPDATE investments
         SET status='completed', settled_at=statement_timestamp()
         WHERE id=$1 AND status='active' AND settled_at IS NULL
         RETURNING id`,
        [investment.id],
      );
      if (!completed.rowCount) throw new Error(`INVESTMENT_STATE_CHANGED:${investment.id}`);
      settled += 1;
    }

    return settled;
  });
}

async function runInvestmentSettlementJob() {
  try {
    const count = await settleMaturedInvestments();
    if (count > 0) {
      console.info(`Investment settlement completed: ${count} investment(s).`);
    }
  } catch (error) {
    console.error("Investment settlement job failed:", error);
  }
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

async function distributeReferralCommissions(
  client: import("pg").PoolClient,
  userId: string,
  baseAmount: number,
  sourceTransactionId?: string,
  sourceDesc = "عمولة إحالة",
) {
  if (baseAmount <= 0) return;
  const settings = await getSettings();
  const rates: Record<number, number> = {
    1: number(settings.referral_rate_l1 ?? 0.08),
    2: number(settings.referral_rate_l2 ?? 0.04),
    3: number(settings.referral_rate_l3 ?? 0.01),
  };

  const refs = await client.query<{ referrer_id: string; level: number }>(
    "SELECT referrer_id, level FROM referrals WHERE referred_id = $1 ORDER BY level ASC",
    [userId],
  );

  const userProfile = await client.query<{ username: string }>(
    "SELECT username FROM profiles WHERE id = $1",
    [userId],
  );
  const referredUsername = userProfile.rows[0]?.username || "عضو في فريقك";

  for (const row of refs.rows) {
    const rate = rates[row.level] ?? 0;
    if (rate > 0) {
      const commission = Math.round(baseAmount * rate * 100) / 100;
      if (commission > 0) {
        await changeBalance(
          client,
          row.referrer_id,
          commission,
          "referral_commission",
          `${sourceDesc} - المستوى ${row.level} (من ${referredUsername})`,
          sourceTransactionId,
        );
        await client.query("UPDATE wallets SET team_income = team_income + $1 WHERE user_id = $2", [
          commission,
          row.referrer_id,
        ]);
        await client.query(
          "INSERT INTO referral_commissions (referrer_id, referred_id, source_transaction_id, level, amount) VALUES ($1,$2,$3,$4,$5)",
          [row.referrer_id, userId, sourceTransactionId || null, row.level, commission],
        );
        await client.query(
          "INSERT INTO rewards (user_id, source, amount, description_ar, reference_id) VALUES ($1, 'referral', $2, $3, $4)",
          [
            row.referrer_id,
            commission,
            `عمولة إحالة مستوى ${row.level} من ${referredUsername}`,
            sourceTransactionId || null,
          ],
        );
        await client.query(
          "INSERT INTO notifications (user_id, title_ar, body_ar) VALUES ($1, $2, $3)",
          [
            row.referrer_id,
            "عمولة إحالة جديدة 💰",
            `حصلت على مكافأة إحالة بقيمة ${commission.toFixed(2)} من نشاط العضو ${referredUsername} (المستوى ${row.level}).`,
          ],
        );
      }
    }
  }
}

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const { username, email, phone, password, referralCode } = request.body ?? {};
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      typeof email !== "string" ||
      !email.includes("@") ||
      typeof password !== "string" ||
      password.length < 6
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
      const referrerL1Id = referral.rows[0]?.id ?? null;
      await client.query(
        `INSERT INTO profiles (id, username, email, phone, referral_code, referred_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          userId,
          username.trim(),
          emailValue,
          phone?.trim() || null,
          `VZ${userId.slice(0, 8).toUpperCase()}`,
          referrerL1Id,
        ],
      );

      if (referrerL1Id) {
        // Level 1
        await client.query(
          "INSERT INTO referrals (referrer_id, referred_id, level) VALUES ($1,$2,1) ON CONFLICT (referrer_id, referred_id) DO NOTHING",
          [referrerL1Id, userId],
        );
        // Level 2
        const l2 = await client.query<{ referred_by: string }>(
          "SELECT referred_by FROM profiles WHERE id = $1",
          [referrerL1Id],
        );
        const referrerL2Id = l2.rows[0]?.referred_by;
        if (referrerL2Id) {
          await client.query(
            "INSERT INTO referrals (referrer_id, referred_id, level) VALUES ($1,$2,2) ON CONFLICT (referrer_id, referred_id) DO NOTHING",
            [referrerL2Id, userId],
          );
          // Level 3
          const l3 = await client.query<{ referred_by: string }>(
            "SELECT referred_by FROM profiles WHERE id = $1",
            [referrerL2Id],
          );
          const referrerL3Id = l3.rows[0]?.referred_by;
          if (referrerL3Id) {
            await client.query(
              "INSERT INTO referrals (referrer_id, referred_id, level) VALUES ($1,$2,3) ON CONFLICT (referrer_id, referred_id) DO NOTHING",
              [referrerL3Id, userId],
            );
          }
        }
      }

      await client.query("INSERT INTO wallets (user_id) VALUES ($1)", [userId]);
      await client.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')", [userId]);
      return userId;
    });
    const token = await createSession(result, response);
    return response.status(201).json({
      ok: true,
      token,
      user: {
        id: result,
        email: emailValue,
        username: username.trim(),
        role: "user",
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return response.status(409).json({ message: "ACCOUNT_EXISTS" });
    return next(error);
  }
});

app.post("/api/auth/change-password", async (request, response, next) => {
  try {
    const user = await requireAuth(request);
    const { newPassword } = request.body ?? {};
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return response
        .status(400)
        .json({ ok: false, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." });
    }
    const newHash = await hashPassword(newPassword);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
    response.json({ ok: true, message: "تم تغيير كلمة المرور بنجاح." });
  } catch (error) {
    next(error);
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
    const token = await createSession(row.id, response);
    const userProfile = await query<{ username: string; email: string; role: string }>(
      `SELECT p.username, p.email,
              COALESCE((SELECT role FROM user_roles WHERE user_id = p.id ORDER BY role = 'admin' DESC LIMIT 1), 'user') AS role
       FROM profiles p WHERE p.id = $1`,
      [row.id],
    );
    return response.json({
      ok: true,
      token,
      user: {
        id: row.id,
        email: userProfile.rows[0]?.email || String(email).trim().toLowerCase(),
        username: userProfile.rows[0]?.username || "user",
        role: userProfile.rows[0]?.role || "user",
      },
    });
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
    const [profile, wallet, settings, prizes, daily] = await Promise.all([
      query(
        "SELECT id, username, email, vip_level, referral_code, trial_active, trial_expires_at, wheel_spins_available, can_withdraw FROM profiles WHERE id = $1",
        [user.id],
      ),
      query(
        "SELECT balance, total_earned, invested_balance, team_income FROM wallets WHERE user_id = $1",
        [user.id],
      ),
      getSettings(true),
      query(
        "SELECT id, label_ar, prize_type, prize_value, icon, accent, probability FROM lucky_wheel_configs WHERE is_active = true ORDER BY sort_order",
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
        spinsLeft: Math.max(0, number(profile.rows[0]?.wheel_spins_available ?? 0)),
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
    const result = await withTransaction(async (client) => {
      const prof = await client.query<{ wheel_spins_available: number }>(
        "SELECT wheel_spins_available FROM profiles WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      const currentSpins = number(prof.rows[0]?.wheel_spins_available ?? 0);
      if (currentSpins <= 0) {
        return {
          ok: false,
          reason: "NO_SPINS_LEFT",
          message: "لا توجد لديك فرص متاحة لعجلة الحظ.",
        };
      }

      const prizes = await client.query<{
        id: string;
        label_ar: string;
        prize_type: string;
        prize_value: string;
        probability: string;
        icon: string | null;
        accent: string;
      }>(
        "SELECT id,label_ar,prize_type,prize_value,probability,icon,accent FROM lucky_wheel_configs WHERE is_active=true ORDER BY sort_order",
      );
      if (!prizes.rowCount) return { ok: false, reason: "NO_PRIZES_CONFIGURED" };

      const totalWeight = prizes.rows.reduce((sum, p) => sum + Number(p.probability), 0);
      if (totalWeight <= 0 || totalWeight > 100) {
        return {
          ok: false,
          reason: "INVALID_WHEEL_CONFIG",
          message: "إعدادات أوزان عجلة الحظ غير صالحة.",
        };
      }

      // Exact weights selection without inventing missing percentage or extra prizes
      const rand = Math.random() * totalWeight;
      let cumulative = 0;
      let prize = prizes.rows[0];
      for (const p of prizes.rows) {
        cumulative += Number(p.probability);
        if (rand < cumulative) {
          prize = p;
          break;
        }
      }

      // Decrement spin chance in database
      await client.query(
        "UPDATE profiles SET wheel_spins_available = wheel_spins_available - 1, updated_at = now() WHERE id = $1",
        [user.id],
      );

      // Record result in PostgreSQL with user, date/time, and prize
      await client.query(
        "INSERT INTO lucky_wheel_spins (user_id, config_id, spin_date, prize_value) VALUES ($1,$2,current_date,$3)",
        [user.id, prize.id, prize.prize_value],
      );

      const prizeVal = number(prize.prize_value);
      if (prizeVal > 0) {
        await changeBalance(client, user.id, prizeVal, "lucky_wheel_reward", "مكافأة عجلة الحظ");
        await client.query(
          "INSERT INTO rewards (user_id, source, amount, description_ar) VALUES ($1,'lucky_wheel',$2,$3)",
          [user.id, prizeVal, prize.label_ar],
        );
      }

      return {
        ok: true,
        id: prize.id,
        prizeId: prize.id,
        label: prize.label_ar,
        prizeType: prize.prize_type,
        prizeValue: prizeVal,
        value: prizeVal,
        cash: prize.prize_type === "cash",
        icon: prize.icon,
        accent: prize.accent,
        spinsLeft: currentSpins - 1,
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
      await client.query(
        "UPDATE profiles SET vip_level=$1,vip_expires_at=$2, wheel_spins_available = COALESCE(wheel_spins_available, 0) + 1, updated_at = now() WHERE id=$3",
        [level, expires, user.id],
      );
      await distributeReferralCommissions(
        client,
        user.id,
        number(plan.rows[0].price),
        plan.rows[0].id,
        `عمولة تفعيل ${plan.rows[0].name}`,
      );
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
      if (!Number.isFinite(value) || value <= 0)
        return { ok: false, reason: "BELOW_MIN_INVESTMENT" };
      const investment = await client.query<{
        id: string;
        expected_profit: string;
        created_at: Date;
        matures_at: Date;
      }>(
        `INSERT INTO investments
           (user_id,fund_id,amount,expected_profit,created_at,matures_at)
         SELECT $1,$2,$3::numeric,round($3::numeric * f.profit_percent / 100,4),
                statement_timestamp(),
                statement_timestamp() + (f.duration_days * interval '1 day')
         FROM investment_funds f
         WHERE f.id=$2 AND f.is_active=true AND $3::numeric >= f.min_amount
         RETURNING id, expected_profit::text, created_at, matures_at`,
        [user.id, fundId, value],
      );
      if (!investment.rowCount) return { ok: false, reason: "BELOW_MIN_INVESTMENT" };
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
      return {
        ok: true,
        investmentId: investment.rows[0].id,
        expectedProfit: number(investment.rows[0].expected_profit),
        createdAt: investment.rows[0].created_at,
        maturesAt: investment.rows[0].matures_at,
        newBalance,
      };
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/app/withdrawal", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const [wallet, address, settings, prof] = await Promise.all([
      query("SELECT balance FROM wallets WHERE user_id = $1", [user.id]),
      query("SELECT network,address,locked FROM withdrawal_addresses WHERE user_id = $1", [
        user.id,
      ]),
      getSettings(true),
      query("SELECT can_withdraw FROM profiles WHERE id = $1", [user.id]),
    ]);

    const globalEnabled = settings.withdrawals_enabled !== "false";
    const userEnabled = prof.rows[0]?.can_withdraw !== false;
    const canWithdraw = globalEnabled && userEnabled;
    let disabledReason: string | null = null;
    if (!globalEnabled) {
      disabledReason = "السحب معطل حالياً لجميع المستخدمين بقرار من إدارة المنصة.";
    } else if (!userEnabled) {
      disabledReason = "تم تعطيل ميزة السحب لحسابك. يرجى التواصل مع الدعم الفني.";
    }

    response.json({
      balance: number(wallet.rows[0]?.balance),
      boundAddress: address.rows[0] ?? null,
      canWithdraw,
      disabledReason,
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

    // Check global withdrawal switch
    if (settings.withdrawals_enabled === "false") {
      return response.status(403).json({
        ok: false,
        reason: "GLOBAL_WITHDRAWALS_DISABLED",
        message: "السحب معطل حالياً لجميع المستخدمين بقرار من إدارة المنصة.",
      });
    }

    // Check per-user withdrawal switch
    const userProf = await query<{ can_withdraw: boolean }>(
      "SELECT can_withdraw FROM profiles WHERE id = $1",
      [user.id],
    );
    if (userProf.rows[0]?.can_withdraw === false) {
      return response.status(403).json({
        ok: false,
        reason: "USER_WITHDRAWALS_DISABLED",
        message: "تم تعطيل ميزة السحب لحسابك. يرجى التواصل مع الدعم الفني.",
      });
    }

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
    const settings = await getSettings();
    const walletRes = await query("SELECT balance FROM wallets WHERE user_id=$1", [user.id]);
    const currentBalance = number(walletRes.rows[0]?.balance);

    if (settings.tasks_enabled === "false") {
      return response.json({
        vipLevel: 0,
        vipName: "VIP",
        isTrial: false,
        videoCommission: 0,
        dailyLimit: 0,
        completedCount: 0,
        remainingTasks: 0,
        videoDuration: 10,
        userBalance: currentBalance,
        allDailyTasksCompleted: true,
        tasksEnabled: false,
        message: "لا توجد مهام اليوم",
        tasks: [],
      });
    }

    const [tasks, completions, profile, plans] = await Promise.all([
      query("SELECT * FROM tasks WHERE is_active=true ORDER BY sort_order"),
      query(
        "SELECT task_id FROM task_completions WHERE user_id=$1 AND completion_date=current_date",
        [user.id],
      ),
      query("SELECT vip_level,trial_active,trial_expires_at FROM profiles WHERE id=$1", [user.id]),
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
      userBalance: currentBalance,
      allDailyTasksCompleted: completed.size >= limit,
      tasksEnabled: true,
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
    const settings = await getSettings();
    if (settings.tasks_enabled === "false") {
      return response.json({ ok: false, reason: "TASKS_DISABLED", message: "لا توجد مهام اليوم" });
    }
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
    const [profile, referrals, wallet, settings, commissions] = await Promise.all([
      query("SELECT id,username,email,referral_code FROM profiles WHERE id=$1", [user.id]),
      query(
        `SELECT p.id, p.username, p.email, p.vip_level, p.created_at, r.level
         FROM referrals r
         JOIN profiles p ON p.id = r.referred_id
         WHERE r.referrer_id = $1
         ORDER BY r.created_at DESC`,
        [user.id],
      ),
      query("SELECT team_income FROM wallets WHERE user_id=$1", [user.id]),
      getSettings(),
      query(
        `SELECT rc.id, rc.level, rc.amount, rc.created_at, p.username AS referred_username
         FROM referral_commissions rc
         JOIN profiles p ON p.id = rc.referred_id
         WHERE rc.referrer_id = $1
         ORDER BY rc.created_at DESC LIMIT 50`,
        [user.id],
      ),
    ]);

    const l1Members = referrals.rows.filter((r) => r.level === 1);
    const l2Members = referrals.rows.filter((r) => r.level === 2);
    const l3Members = referrals.rows.filter((r) => r.level === 3);

    const l1Earnings = commissions.rows
      .filter((c) => c.level === 1)
      .reduce((sum, c) => sum + number(c.amount), 0);
    const l2Earnings = commissions.rows
      .filter((c) => c.level === 2)
      .reduce((sum, c) => sum + number(c.amount), 0);
    const l3Earnings = commissions.rows
      .filter((c) => c.level === 3)
      .reduce((sum, c) => sum + number(c.amount), 0);

    const r1 = number(settings.referral_rate_l1 ?? 0.08);
    const r2 = number(settings.referral_rate_l2 ?? 0.04);
    const r3 = number(settings.referral_rate_l3 ?? 0.01);

    response.json({
      referralCode: profile.rows[0]?.referral_code || "",
      totalMembers: referrals.rows.length,
      teamRewards: number(wallet.rows[0]?.team_income),
      teamIncome: number(wallet.rows[0]?.team_income),
      rates: { l1: r1, l2: r2, l3: r3 },
      levels: [
        {
          level: 1,
          members: l1Members.length,
          earnings: l1Earnings,
          ratePercent: `${Math.round(r1 * 100)}%`,
        },
        {
          level: 2,
          members: l2Members.length,
          earnings: l2Earnings,
          ratePercent: `${Math.round(r2 * 100)}%`,
        },
        {
          level: 3,
          members: l3Members.length,
          earnings: l3Earnings,
          ratePercent: `${Math.round(r3 * 100)}%`,
        },
      ],
      members: referrals.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        level: row.level,
        vipLevel: row.vip_level,
        createdAt: row.created_at,
      })),
      commissions: commissions.rows,
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
    const [
      users,
      pendingDeposits,
      pendingWithdrawals,
      approvedWithdrawals,
      approvedDeposits,
      walletsBalance,
      investments,
      tasks,
    ] = await Promise.all([
      query("SELECT count(*)::int AS count FROM users"),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM deposits WHERE status='pending'",
      ),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM withdrawals WHERE status='pending'",
      ),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM withdrawals WHERE status IN ('approved', 'completed')",
      ),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM deposits WHERE status IN ('approved', 'completed')",
      ),
      query("SELECT coalesce(sum(balance),0) AS total_balance FROM wallets"),
      query(
        "SELECT count(*)::int AS count, coalesce(sum(amount),0) AS amount FROM investments WHERE status='active'",
      ),
      query("SELECT count(*)::int AS count FROM task_completions"),
    ]);

    const totalWithdrawnAmount = number(approvedWithdrawals.rows[0]?.amount);
    const totalDepositedAmount = number(approvedDeposits.rows[0]?.amount);
    const totalBalanceAmount = number(walletsBalance.rows[0]?.total_balance);
    const usersCountNum = number(users.rows[0]?.count);

    response.json({
      usersCount: usersCountNum,
      totalUsers: usersCountNum,
      totalBalance: totalBalanceAmount,
      totalDeposited: totalDepositedAmount,
      totalWithdrawn: totalWithdrawnAmount,
      pendingDepositsCount: number(pendingDeposits.rows[0]?.count),
      pendingDepositsAmount: number(pendingDeposits.rows[0]?.amount),
      pendingWithdrawalsCount: number(pendingWithdrawals.rows[0]?.count),
      pendingWithdrawalsAmount: number(pendingWithdrawals.rows[0]?.amount),
      approvedWithdrawalsCount: number(approvedWithdrawals.rows[0]?.count),
      approvedWithdrawalsAmount: totalWithdrawnAmount,
      activeInvestmentsCount: number(investments.rows[0]?.count),
      activeInvestmentsVolume: number(investments.rows[0]?.amount),
      taskCompletionsCount: number(tasks.rows[0]?.count),
      totalTasksCompleted: number(tasks.rows[0]?.count),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users", async (_request, response, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.username, p.email, p.phone, p.referral_code, p.vip_level, p.trial_active,
              p.is_blocked, p.can_withdraw, p.wheel_spins_available, p.created_at,
              w.balance, w.total_deposited, w.total_withdrawn, w.invested_balance, w.team_income,
              wa.address AS withdrawal_address, wa.network AS withdrawal_network,
              (
                SELECT count(DISTINCT member_id)::int
                FROM (
                  SELECT r.referred_id AS member_id
                  FROM referrals r
                  WHERE r.referrer_id = p.id
                  UNION
                  SELECT p_sub.id AS member_id
                  FROM profiles p_sub
                  WHERE p_sub.referred_by = p.id
                ) all_refs
                JOIN profiles pr ON pr.id = all_refs.member_id
                WHERE pr.vip_level >= 1 AND pr.vip_level <= 7
              ) AS team_vip_count,
              COALESCE((
                SELECT sum(w_sub.amount)
                FROM withdrawals w_sub
                WHERE w_sub.user_id IN (
                  SELECT r.referred_id
                  FROM referrals r
                  WHERE r.referrer_id = p.id
                  UNION
                  SELECT p_sub.id
                  FROM profiles p_sub
                  WHERE p_sub.referred_by = p.id
                )
                AND w_sub.status IN ('approved', 'completed')
              ), 0) AS team_withdrawn,
              COALESCE((
                SELECT sum(w_own.amount)
                FROM withdrawals w_own
                WHERE w_own.user_id = p.id
                  AND w_own.status IN ('approved', 'completed')
              ), 0) AS user_approved_withdrawn
       FROM profiles p
       LEFT JOIN wallets w ON w.user_id = p.id
       LEFT JOIN withdrawal_addresses wa ON wa.user_id = p.id
       ORDER BY p.created_at DESC LIMIT 200`,
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
        canWithdraw: row.can_withdraw !== false,
        wheelSpins: number(row.wheel_spins_available ?? 0),
        withdrawalAddress: row.withdrawal_address || null,
        withdrawalNetwork: row.withdrawal_network || null,
        createdAt: row.created_at,
        balance: number(row.balance),
        totalDeposited: number(row.total_deposited),
        totalWithdrawn: number(row.user_approved_withdrawn),
        userWithdrawn: number(row.user_approved_withdrawn),
        teamWithdrawn: number(row.team_withdrawn),
        teamVipCount: number(row.team_vip_count),
        teamCount: number(row.team_vip_count),
        investedBalance: number(row.invested_balance),
        teamIncome: number(row.team_income),
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

app.post("/api/admin/users/toggle-withdrawal", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const { userId, canWithdraw } = request.body ?? {};
    await query("UPDATE profiles SET can_withdraw = $1, updated_at = now() WHERE id = $2", [
      Boolean(canWithdraw),
      userId,
    ]);
    await query(
      "INSERT INTO admin_actions (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)",
      [
        admin.id,
        "TOGGLE_USER_WITHDRAWAL",
        userId,
        JSON.stringify({ canWithdraw: Boolean(canWithdraw) }),
      ],
    );
    response.json({ ok: true, canWithdraw: Boolean(canWithdraw) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/withdrawal-address", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const { userId, address, network } = request.body ?? {};
    const net = network || "TRC20";
    const addr = String(address ?? "").trim();
    if (!addr) {
      return response.status(400).json({ ok: false, message: "عنوان المحفظة مطلوب" });
    }
    await query(
      `INSERT INTO withdrawal_addresses (user_id, network, address, locked)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (user_id) DO UPDATE SET address = $3, network = $2, locked = false`,
      [userId, net, addr],
    );
    await query(
      "INSERT INTO admin_actions (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)",
      [
        admin.id,
        "UPDATE_USER_WITHDRAWAL_ADDRESS",
        userId,
        JSON.stringify({ address: addr, network: net }),
      ],
    );
    response.json({ ok: true, address: addr, network: net });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/add-wheel-spin", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const { userId, count } = request.body ?? {};
    const addCount = Math.max(1, Number(count) || 1);
    const updated = await query<{ wheel_spins_available: number }>(
      `UPDATE profiles
       SET wheel_spins_available = COALESCE(wheel_spins_available, 0) + $1, updated_at = now()
       WHERE id = $2 RETURNING wheel_spins_available`,
      [addCount, userId],
    );
    await query("INSERT INTO notifications (user_id, title_ar, body_ar) VALUES ($1, $2, $3)", [
      userId,
      "فرصة مجانية لعجلة الحظ! 🎟️",
      `منحتك إدارة المنصة ${addCount} فرصة مجانية إضافية في عجلة الحظ. جرب حظك الآن!`,
    ]);
    await query(
      "INSERT INTO admin_actions (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)",
      [admin.id, "ADD_FREE_WHEEL_SPIN", userId, JSON.stringify({ count: addCount })],
    );
    response.json({ ok: true, newSpins: updated.rows[0]?.wheel_spins_available ?? addCount });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/vip", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const targetUserId = request.body?.targetUserId;
    const vipLevel = Number(request.body?.vipLevel);
    await query(
      "UPDATE profiles SET vip_level=$1, wheel_spins_available = COALESCE(wheel_spins_available, 0) + 1, updated_at=now() WHERE id=$2",
      [vipLevel, targetUserId],
    );
    await query(
      "INSERT INTO notifications (user_id,title_ar,body_ar) VALUES ($1,'ترقية مستوى VIP',$2)",
      [
        targetUserId,
        `تم تحديث رتبتك إلى VIP ${vipLevel} من قبل إدارة المنصة وحصلت على فرصة واحدة في عجلة الحظ.`,
      ],
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
      const balance = await changeBalance(client, targetUserId, amount, "admin_adjustment", reason);
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
      if (!deposit.rowCount) throw Object.assign(new Error("DEPOSIT_NOT_FOUND"), { status: 404 });
      if (deposit.rows[0].status !== "pending")
        throw Object.assign(new Error("ALREADY_PROCESSED"), { status: 409 });
      const status = action === "approve" ? "approved" : "rejected";
      if (status === "approved") {
        const depAmount = number(deposit.rows[0].amount);
        await changeBalance(
          client,
          deposit.rows[0].user_id,
          depAmount,
          "deposit",
          "اعتماد طلب الإيداع",
          depositId,
        );
        await distributeReferralCommissions(
          client,
          deposit.rows[0].user_id,
          depAmount,
          depositId,
          "عمولة إيداع إحالة",
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
      }>("SELECT id,user_id,amount,status FROM withdrawals WHERE id=$1 FOR UPDATE", [withdrawalId]);
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
        [
          action === "approve" ? "approved" : "rejected",
          rejectReason ?? null,
          admin.id,
          withdrawalId,
        ],
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
        [
          taskNumber,
          data.title,
          data.description,
          youtubeId,
          durationSeconds,
          sortOrder,
          isActive,
          data.id,
        ],
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
        [
          label,
          prizeType,
          prizeValue,
          data.probability ?? 0,
          data.icon ?? null,
          data.accent ?? "blue",
          isActive,
          data.id,
        ],
      );
    } else {
      await query(
        "INSERT INTO lucky_wheel_configs (label_ar,prize_type,prize_value,probability,icon,accent,sort_order) VALUES ($1,$2,$3,$4,$5,$6,99)",
        [
          label,
          prizeType,
          prizeValue,
          data.probability ?? 0,
          data.icon ?? null,
          data.accent ?? "blue",
        ],
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

async function initDatabase() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No POSTGRES_URL or DATABASE_URL provided; backend cannot start.");
  }
  try {
    // Ensure default primary admin user exists and is linked
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@valoriza.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCheck = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [
      adminEmail,
    ]);
    let adminId = adminCheck.rows[0]?.id;

    if (!adminId && adminPassword) {
      const adminHash = await hashPassword(adminPassword);
      const res = await query<{ id: string }>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [adminEmail, adminHash],
      );
      adminId = res.rows[0].id;
      await query(
        `INSERT INTO profiles (id, username, email, referral_code)
         VALUES ($1, 'admin', $2, 'ADMIN')
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
        [adminId, adminEmail],
      );
      await query(
        "INSERT INTO wallets (user_id, balance) VALUES ($1, 1000) ON CONFLICT (user_id) DO NOTHING",
        [adminId],
      );
      await query(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT (user_id, role) DO NOTHING",
        [adminId],
      );
      await query(
        "INSERT INTO admin_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [adminId],
      );
      console.log("Primary admin account provisioned.");
    } else if (!adminId) {
      console.warn("Primary admin provisioning skipped because ADMIN_PASSWORD is not configured.");
    } else {
      await query(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT (user_id, role) DO NOTHING",
        [adminId],
      );
      await query(
        "INSERT INTO admin_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [adminId],
      );
      console.log(`👑 Primary admin verified: ${adminEmail}`);
    }

    // Ensure default user exists
    const userEmail = (process.env.USER_EMAIL || "user@valoriza.com").trim().toLowerCase();
    const userPassword = process.env.USER_PASSWORD;
    const userCheck = await query("SELECT id FROM users WHERE email = $1", [userEmail]);
    if (!userCheck.rowCount && userPassword) {
      const userHash = await hashPassword(userPassword);
      const res = await query<{ id: string }>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [userEmail, userHash],
      );
      const uId = res.rows[0].id;
      await query(
        `INSERT INTO profiles (id, username, email, referral_code)
         VALUES ($1, 'valoriza_user', $2, 'VALORIZAUSER')
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
        [uId, userEmail],
      );
      await query(
        "INSERT INTO wallets (user_id, balance) VALUES ($1, 100) ON CONFLICT (user_id) DO NOTHING",
        [uId],
      );
      await query(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, 'user') ON CONFLICT (user_id, role) DO NOTHING",
        [uId],
      );
      console.log("Default test user provisioned.");
    }

    // Seed default investment funds if empty
    const fundsCount = await query("SELECT count(*)::int as count FROM investment_funds");
    if ((fundsCount.rows[0]?.count ?? 0) === 0) {
      const funds = [
        [
          "MUMBAI",
          "صندوق مومباي",
          "MUMBAI FUND",
          "استثمار ذكي .. لعوائد أسرع",
          3,
          3.08,
          5,
          "cyan",
          1,
        ],
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
        [
          "NBL",
          "صندوق NBL",
          "NBL FUND",
          "نمو مستدام .. لثروتك المستقبلية",
          160,
          10.8,
          5,
          "purple",
          4,
        ],
      ];
      for (const fund of funds) {
        await query(
          `INSERT INTO investment_funds (code, name_ar, name_en, tagline_ar, duration_days, profit_percent, min_amount, accent, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (code) DO NOTHING`,
          fund,
        );
      }
    }

    // Seed default VIP packages if empty
    const vipCount = await query("SELECT count(*)::int as count FROM vip_packages");
    if ((vipCount.rows[0]?.count ?? 0) === 0) {
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
        await query(
          `INSERT INTO vip_packages (level, name, price, daily_profit, daily_tasks, task_reward, accent)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (level) DO NOTHING`,
          plan,
        );
      }
    }

    // Seed default platform settings if empty or missing new settings
    const settings: [string, string, string, boolean][] = [
      ["min_deposit", "10", "الحد الأدنى للإيداع بالدولار", true],
      ["min_withdrawal", "6", "الحد الأدنى للسحب بالدولار", true],
      ["withdrawal_fee_percent", "10", "نسبة رسوم السحب", true],
      ["withdrawal_start_hour", "09:00", "بداية وقت السحب", true],
      ["withdrawal_end_hour", "16:00", "نهاية وقت السحب", true],
      ["withdrawals_enabled", "true", "تفعيل السحب", true],
      ["tasks_enabled", "true", "تفعيل المهام اليومية", true],
      ["telegram_group_url", "https://t.me/valoriza_official", "رابط مجموعة Telegram", true],
      ["whatsapp_group_url", "https://chat.whatsapp.com/valoriza", "رابط مجموعة WhatsApp", true],
      ["min_investment", "5", "الحد الأدنى للاستثمار", true],
      ["daily_login_reward", "0.11", "مكافأة تسجيل الدخول اليومية", true],
      ["referral_rate_l1", "0.08", "عمولة المستوى الأول", true],
      ["referral_rate_l2", "0.04", "عمولة المستوى الثاني", true],
      ["referral_rate_l3", "0.01", "عمولة المستوى الثالث", true],
      ["daily_spins", "1", "فرص عجلة الحظ", true],
    ];
    for (const setting of settings) {
      await query(
        `INSERT INTO platform_settings (key, value, description_ar, is_public)
         VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING`,
        setting,
      );
    }

    // Ensure 9 lucky wheel configs
    const wheelCount = await query("SELECT count(*)::int as count FROM lucky_wheel_configs");
    if ((wheelCount.rows[0]?.count ?? 0) === 0) {
      await query(`
        INSERT INTO lucky_wheel_configs (label_ar, prize_type, prize_value, probability, icon, accent, sort_order, is_active) VALUES
          ('حظ سعيد', 'none', 0, 25, '🍀', 'blue', 1, true),
          ('حظ سعيد', 'none', 0, 25, '🎯', 'blue', 2, true),
          ('0.5 دولار', 'cash', 0.5, 10, '💵', 'green', 3, true),
          ('1 دولار', 'cash', 1.0, 10, '💰', 'green', 4, true),
          ('2 دولار', 'cash', 2.0, 5, '🪙', 'purple', 5, true),
          ('هاتف نقال', 'item', 0, 0, '📱', 'red', 6, true),
          ('48 دولار', 'cash', 48.0, 0, '💎', 'gold', 7, true),
          ('4 دولار', 'cash', 4.0, 0, '🎁', 'purple', 8, true),
          ('مستوى VIP', 'vip', 0, 0, '👑', 'gold', 9, true)
      `);
    }

    // Ensure 14 YouTube tasks
    const taskCount = await query("SELECT count(*)::int as count FROM tasks");
    if ((taskCount.rows[0]?.count ?? 0) === 0) {
      await query(`
        INSERT INTO tasks (task_number, title, description, youtube_id, duration_seconds, sort_order, is_active) VALUES
          (1, 'مهمة إعلانية 1', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '66Z_Rgwrh7E', 10, 1, true),
          (2, 'مهمة إعلانية 2', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '-RuSqMYcQK0', 10, 2, true),
          (3, 'مهمة إعلانية 3', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'z4LaVLItrKc', 10, 3, true),
          (4, 'مهمة إعلانية 4', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'eaPCE8XqaRA', 10, 4, true),
          (5, 'مهمة إعلانية 5', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'DhRKKs71xP8', 10, 5, true),
          (6, 'مهمة إعلانية 6', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'ygLLiNT2AIQ', 10, 6, true),
          (7, 'مهمة إعلانية 7', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'Tlnl6w8OtQs', 10, 7, true),
          (8, 'مهمة إعلانية 8', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'SfXQw0hu73Y', 10, 8, true),
          (9, 'مهمة إعلانية 9', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'ELF0AM4Jrm0', 10, 9, true),
          (10, 'مهمة إعلانية 10', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '3cQ-9D8ofHw', 10, 10, true),
          (11, 'مهمة إعلانية 11', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'L8EZdwAbjQA', 10, 11, true),
          (12, 'مهمة إعلانية 12', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'I3-lMkyTsc8', 10, 12, true),
          (13, 'مهمة إعلانية 13', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', '39f20_0tgz0', 10, 13, true),
          (14, 'مهمة إعلانية 14', 'شاهد مقطع الفيديو الترويجي لإكمال المهمة وكسب المكافأة', 'hmSxy2JKTPw', 10, 14, true)
      `);
    }
  } catch (err) {
    console.error("❌ initDatabase error:", err);
    throw err;
  }
}

const server = createServer(app);
let settlementTimer: NodeJS.Timeout | undefined;
server.listen(port, "0.0.0.0", async () => {
  console.log(`Valoriza backend listening on port ${port}`);
  try {
    await initDatabase();
    await runInvestmentSettlementJob();
    const intervalMs = Number(process.env.INVESTMENT_SETTLEMENT_INTERVAL_MS ?? 15_000);
    if (!Number.isFinite(intervalMs) || intervalMs < 1_000) {
      throw new Error("INVESTMENT_SETTLEMENT_INTERVAL_MS must be at least 1000.");
    }
    settlementTimer = setInterval(() => void runInvestmentSettlementJob(), intervalMs);
    settlementTimer.unref();
  } catch (error) {
    console.error("Backend initialization failed:", error);
    server.close(() => process.exit(1));
  }
});

async function shutdown() {
  if (settlementTimer) clearInterval(settlementTimer);
  server.close();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { app, initDatabase };
