import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";
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
import {
  createDepositProofReadUrl,
  createDepositProofUpload,
  verifyDepositProofObject,
} from "./deposit-proof-storage.js";

const app = express();
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

app.get("/api/ping", (_request, response) => {
  response.json({ ok: true, time: new Date().toISOString() });
});

function number(value: unknown) {
  return Number(value ?? 0);
}

const DEFAULT_DAILY_LOGIN_REWARD = 0.11;

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
  await query(
    `WITH ensure_wallet AS (
       INSERT INTO wallets (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id
     ),
     ensure_wheel_chances AS (
       INSERT INTO user_wheel_chances (user_id,chances) VALUES ($1,0)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id
     )
     SELECT 1`,
    [userId],
  );
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
    `UPDATE wallets SET balance = $1, total_earned = total_earned + CASE WHEN $2::numeric > 0 AND $3 <> 'deposit' THEN $2::numeric ELSE 0 END,
      total_deposited = total_deposited + CASE WHEN $3 = 'deposit' THEN $2::numeric ELSE 0 END,
      total_withdrawn = total_withdrawn + CASE WHEN $3 = 'withdrawal' THEN -$2::numeric ELSE 0 END,
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
      // Materialize up to three ancestors. Each member belongs to the logged-in
      // referrer's own network; the browser never supplies this relationship.
      let ancestorId = referral.rows[0]?.id as string | undefined;
      for (let level = 1; level <= 3 && ancestorId; level++) {
        await client.query(
          "INSERT INTO referrals (referrer_id,referred_id,level) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [ancestorId, userId, level],
        );
        const parent = await client.query<{ referred_by: string | null }>(
          "SELECT referred_by FROM profiles WHERE id=$1",
          [ancestorId],
        );
        ancestorId = parent.rows[0]?.referred_by ?? undefined;
      }
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
    const currentPassword = String(request.body?.currentPassword ?? "");
    const password = String(request.body?.newPassword ?? request.body?.password ?? "");
    if (!currentPassword) return response.status(400).json({ message: "CURRENT_PASSWORD_REQUIRED" });
    if (password.length < 8) return response.status(400).json({ message: "PASSWORD_TOO_SHORT" });
    if (Buffer.byteLength(password, "utf8") > 72)
      return response.status(400).json({ message: "PASSWORD_TOO_LONG" });
    const currentToken =
      request.cookies?.valoriza_session ||
      request.header("authorization")?.replace(/^Bearer /, "");
    if (!currentToken) return response.status(401).json({ message: "UNAUTHORIZED" });
    const hash = await hashPassword(password);
    await withTransaction(async (client) => {
      const result = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      if (!result.rows[0] || !(await verifyPassword(currentPassword, result.rows[0].password_hash))) {
        const error = new Error("CURRENT_PASSWORD_INVALID") as Error & { status?: number };
        error.status = 400;
        throw error;
      }
      await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, user.id]);
      await client.query(
        `DELETE FROM sessions
         WHERE user_id=$1 AND token_hash <> encode(digest($2, 'sha256'), 'hex')`,
        [user.id, currentToken],
      );
    });
    return response.json({ ok: true, user });
  } catch (error) {
    return next(error);
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

app.post("/api/app/deposit-proof/upload-url", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { contentType, size } = request.body ?? {};
    const imageName = request.body?.name;
    const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (
      typeof imageName !== "string" ||
      imageName.length > 255 ||
      typeof contentType !== "string" ||
      !acceptedTypes.has(contentType) ||
      !Number.isInteger(size) ||
      size <= 0 ||
      size > 5 * 1024 * 1024
    ) {
      return response.status(400).json({ ok: false, reason: "INVALID_PROOF_FILE" });
    }
    const { objectKey, uploadUrl } = await createDepositProofUpload(user.id);
    const proof = await query<{ id: string }>(
      "INSERT INTO deposit_proofs (user_id,object_key,content_type,file_size) VALUES ($1,$2,$3,$4) RETURNING id",
      [user.id, objectKey, contentType, size],
    );
    return response.json({
      ok: true,
      proofId: proof.rows[0].id,
      uploadURL: uploadUrl,
      uploadUrl,
      objectPath: objectKey,
      name: imageName,
      method: "PUT",
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    return next(error);
  }
});

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
        "SELECT chances FROM user_wheel_chances WHERE user_id = $1",
        [user.id],
      ),
      query(
        `SELECT id FROM daily_login_rewards WHERE user_id = $1 AND reward_date =
           (now() AT TIME ZONE COALESCE((SELECT value FROM platform_settings WHERE key='platform_timezone'),'UTC'))::date`,
        [user.id],
      ),
    ]);
    settings.daily_login_reward ??= String(DEFAULT_DAILY_LOGIN_REWARD);
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
        spinsLeft: Math.max(0, number(spins.rows[0]?.chances)),
      },
      dailyReward: {
        amount: number(settings.daily_login_reward),
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
    const amount = number(settings.daily_login_reward ?? DEFAULT_DAILY_LOGIN_REWARD);
    if (!Number.isFinite(amount) || amount < 0)
      return response.status(500).json({ ok: false, reason: "INVALID_DAILY_REWARD_SETTING" });
    const result = await withTransaction(async (client) => {
      const timezone = await client.query<{ value: string }>(
        "SELECT value FROM platform_settings WHERE key='platform_timezone'",
      );
      const platformTimezone = timezone.rows[0]?.value ?? "UTC";
      const inserted = await client.query(
        `INSERT INTO daily_login_rewards (user_id, reward_date, amount)
         VALUES ($1,(now() AT TIME ZONE $2)::date,$3) ON CONFLICT (user_id,reward_date) DO NOTHING RETURNING id`,
        [user.id, platformTimezone, amount],
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
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/app/spin", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const result = await withTransaction(async (client) => {
      await client.query(
        "INSERT INTO user_wheel_chances (user_id,chances) VALUES ($1,0) ON CONFLICT (user_id) DO NOTHING",
        [user.id],
      );
      const balance = await client.query<{ chances: number }>(
        "SELECT chances FROM user_wheel_chances WHERE user_id=$1 FOR UPDATE",
        [user.id],
      );
      const chances = Number(balance.rows[0]?.chances ?? 0);
      if (chances <= 0) return { ok: false, reason: "NO_SPINS_LEFT", spinsLeft: 0 };
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
      const totalWeight = prizes.rows.reduce((sum, row) => sum + Math.max(0, number(row.probability)), 0);
      if (!Number.isFinite(totalWeight) || totalWeight <= 0)
        return { ok: false, reason: "NO_PRIZE_PROBABILITIES_CONFIGURED" };
      let pick = Math.random() * totalWeight;
      let prize = prizes.rows[prizes.rows.length - 1];
      for (const candidate of prizes.rows) {
        pick -= Math.max(0, number(candidate.probability));
        if (pick < 0) {
          prize = candidate;
          break;
        }
      }
      await client.query(
        "UPDATE user_wheel_chances SET chances=chances-1,updated_at=now() WHERE user_id=$1",
        [user.id],
      );
      await client.query(
        `INSERT INTO lucky_wheel_spins (user_id,config_id,spin_date,prize_value)
         VALUES ($1,$2,(now() AT TIME ZONE COALESCE((SELECT value FROM platform_settings WHERE key='platform_timezone'),'UTC'))::date,$3)`,
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
        spinsLeft: chances - 1,
      };
    });
    return response.json(result);
  } catch (error) {
    return next(error);
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
        `SELECT id FROM daily_login_rewards WHERE user_id = $1 AND reward_date =
           (now() AT TIME ZONE COALESCE((SELECT value FROM platform_settings WHERE key='platform_timezone'),'UTC'))::date`,
        [user.id],
      ),
    ]);
    response.json({
      profile: profile.rows[0],
      balance: number(wallet.rows[0]?.balance),
      dailyReward: {
        amount: number(settings.daily_login_reward ?? DEFAULT_DAILY_LOGIN_REWARD),
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
    const [depositResult, withdrawalResult, transactionResult, rewardResult] = await Promise.all([
      query(
        `SELECT id, amount, network, deposit_address AS address, tx_hash AS "txHash", status,
                reject_reason AS "adminNote", created_at AS "createdAt"
         FROM deposits WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [user.id],
      ),
      query(
        `SELECT id, amount, fee, net_amount AS "netAmount", network, address, status,
                reject_reason AS "adminNote", created_at AS "createdAt"
         FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [user.id],
      ),
      query(
        `SELECT id, type, status, amount, balance_after AS "balanceAfter", description,
                created_at AS "createdAt"
         FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [user.id],
      ),
      query(
        `SELECT id, source, amount, description_ar AS description, created_at AS "createdAt"
         FROM rewards WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [user.id],
      ),
    ]);
    const deposits = depositResult.rows.map((row) => ({
      ...row,
      amount: number(row.amount),
      createdAt: row.createdAt,
    }));
    const withdrawals = withdrawalResult.rows.map((row) => ({
      ...row,
      amount: number(row.amount),
      fee: number(row.fee),
      netAmount: number(row.netAmount),
      createdAt: row.createdAt,
    }));
    const transactions = transactionResult.rows.map((row) => ({
      ...row,
      amount: number(row.amount),
      balanceAfter: number(row.balanceAfter),
      createdAt: row.createdAt,
    }));
    const rewards = rewardResult.rows.map((row) => ({
      ...row,
      amount: number(row.amount),
      createdAt: row.createdAt,
    }));
    const records = [
      ...transactions,
      ...deposits.map((row) => ({ ...row, type: "deposit", description: "طلب إيداع" })),
      ...withdrawals.map((row) => ({ ...row, type: "withdrawal", description: "طلب سحب" })),
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 100);
    response.json({
      deposits,
      withdrawals,
      transactions,
      rewards,
      records,
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
    if (!Number.isInteger(level) || level < 1)
      return response.status(400).json({ ok: false, reason: "INVALID_VIP_LEVEL" });
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
      const chanceSetting = await client.query<{ value: string }>(
        "SELECT value FROM platform_settings WHERE key='daily_spins'",
      );
      const grantedChances = Number(chanceSetting.rows[0]?.value ?? 3);
      if (!Number.isInteger(grantedChances) || grantedChances < 0)
        throw new Error("INVALID_VIP_SPIN_CHANCES_SETTING");
      await client.query(
        `INSERT INTO user_wheel_chances (user_id,chances) VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET chances=user_wheel_chances.chances+EXCLUDED.chances,updated_at=now()`,
        [user.id, grantedChances],
      );
      const wallet = await client.query("SELECT balance FROM wallets WHERE user_id=$1", [user.id]);
      return { ok: true, vipLevel: level, newBalance: number(wallet.rows[0]?.balance), grantedChances };
    });
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/app/deposit", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { amount, txHash, proofId } = request.body ?? {};
    const objectPath = request.body?.objectPath;
    const network = String(request.body?.network ?? "").replace(/^USDT-/, "").toUpperCase();
    if (
      (proofId !== undefined && (typeof proofId !== "string" || !/^[0-9a-f-]{36}$/i.test(proofId))) ||
      (objectPath !== undefined && typeof objectPath !== "string")
    )
      return response.status(400).json({ ok: false, reason: "INVALID_DEPOSIT_PROOF" });
    const settings = await getSettings();
    const value = Number(amount);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value >= 1e14 ||
      !["ERC20", "BEP20", "TRC20"].includes(network)
    )
      return response.status(400).json({ ok: false, reason: "INVALID_DEPOSIT_REQUEST" });
    const minimum = number(settings.min_deposit ?? 10);
    if (!Number.isFinite(minimum) || minimum < 0)
      return response.status(500).json({ ok: false, reason: "INVALID_MIN_DEPOSIT_SETTING" });
    if (value < minimum)
      return response.status(400).json({ ok: false, reason: "BELOW_MIN_DEPOSIT" });
    const address = settings[`deposit_address_${network}`] ?? "";
    if (!address) return response.status(503).json({ ok: false, reason: "DEPOSIT_ADDRESS_NOT_CONFIGURED" });
    const proof = await query<{
      id: string;
      object_key: string;
      content_type: string;
      file_size: number;
    }>(
      `SELECT id,object_key,content_type,file_size FROM deposit_proofs
       WHERE user_id=$1 AND ($2::uuid IS NULL OR id=$2)
         AND ($3::text IS NULL OR object_key=$3)
         AND NOT EXISTS (SELECT 1 FROM deposits d WHERE d.proof_id=deposit_proofs.id)
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, proofId ?? null, objectPath ?? null],
    );
    if (
      (typeof proofId !== "string" && typeof objectPath !== "string") ||
      !proof.rowCount ||
      (proofId && objectPath && proof.rows[0].object_key !== objectPath)
    )
      return response.status(400).json({ ok: false, reason: "SCREENSHOT_REQUIRED" });
    if (
      !(await verifyDepositProofObject(
        proof.rows[0].object_key,
        proof.rows[0].content_type,
        number(proof.rows[0].file_size),
      ))
    )
      return response.status(400).json({ ok: false, reason: "INVALID_OR_MISSING_PROOF_FILE" });
    const result = await withTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO deposits (user_id,amount,network,deposit_address,screenshot_url,tx_hash,proof_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          user.id,
          value,
          network,
          String(address),
          "/api/admin/deposits/proof",
          typeof txHash === "string" && txHash.trim() ? txHash.trim().slice(0, 200) : null,
          proof.rows[0].id,
        ],
      );
      return { ok: true, depositId: inserted.rows[0].id };
    });
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/public/about", async (_request, response, next) => {
  try {
    const [settings, links, counts] = await Promise.all([
      getSettings(true),
      query(
        "SELECT id,label_ar,sublabel_ar,platform,url FROM customer_service_links WHERE is_active=true ORDER BY sort_order",
      ),
      query<{ members_count: string; funds_count: string }>(
        `SELECT
           (SELECT COUNT(*)::text FROM users) AS members_count,
           (SELECT COUNT(*)::text FROM investment_funds WHERE is_active=true) AS funds_count`,
      ),
    ]);
    settings.members_count = counts.rows[0].members_count;
    settings.funds_count = counts.rows[0].funds_count;
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
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value >= 1e14 ||
      typeof fundId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(fundId)
    )
      return response.status(400).json({ ok: false, reason: "INVALID_INVESTMENT_AMOUNT" });
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
      const investment = await client.query<{ id: string; expected_profit: string }>(
        "INSERT INTO investments (user_id,fund_id,amount,expected_profit,matures_at) VALUES ($1,$2,$3,$4,$5) RETURNING id,expected_profit",
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
      return {
        ok: true,
        investmentId: investment.rows[0].id,
        newBalance,
        expectedProfit: number(investment.rows[0].expected_profit),
      };
    });
    return response.json(result);
  } catch (error) {
    return next(error);
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
    const normalizedAddress = typeof address === "string" ? address.trim() : "";
    if (
      !["ERC20", "BEP20", "TRC20"].includes(network) ||
      !normalizedAddress ||
      normalizedAddress.length > 256
    )
      return response.status(400).json({ ok: false, reason: "INVALID_WITHDRAWAL_ADDRESS" });
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
      [user.id, network, normalizedAddress],
    );
    return response.json({ ok: true, address: normalizedAddress, network });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/app/withdrawal", async (request, response, next) => {
  try {
    const user = (request as express.Request & { authUser: { id: string } }).authUser;
    const { network, address, amount } = request.body ?? {};
    const value = Number(amount);
    const normalizedAddress = typeof address === "string" ? address.trim() : "";
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value >= 1e14 ||
      !["ERC20", "BEP20", "TRC20"].includes(network) ||
      !normalizedAddress ||
      normalizedAddress.length > 256
    )
      return response.status(400).json({ ok: false, reason: "INVALID_WITHDRAWAL_REQUEST" });
    const settings = await getSettings();
    if (settings.withdrawals_enabled === "false")
      return response.status(403).json({ ok: false, reason: "WITHDRAWALS_DISABLED" });
    const minimum = number(settings.min_withdrawal ?? 6);
    if (value < minimum)
      return response.status(400).json({ ok: false, reason: "BELOW_MIN_WITHDRAWAL", minWithdrawal: minimum });
    const feePercent = number(settings.withdrawal_fee_percent ?? 10);
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100)
      return response.status(500).json({ ok: false, reason: "INVALID_WITHDRAWAL_FEE_SETTING" });
    const fee = Math.round((value * feePercent) * 100) / 10000;
    const result = await withTransaction(async (client) => {
      const locked = await client.query<{ address: string; network: string }>(
        "SELECT address,network FROM withdrawal_addresses WHERE user_id=$1",
        [user.id],
      );
      if (
        locked.rows[0] &&
        (locked.rows[0].address !== normalizedAddress || locked.rows[0].network !== network)
      )
        return {
          ok: false,
          reason: "ADDRESS_MISMATCH",
          message: "العنوان لا يطابق العنوان المقفل.",
        };
      const withdrawal = await client.query<{ id: string }>(
        "INSERT INTO withdrawals (user_id,amount,fee,net_amount,network,address) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [user.id, value, fee, value - fee, network, normalizedAddress],
      );
      await changeBalance(client, user.id, -value, "withdrawal", "طلب سحب", withdrawal.rows[0].id);
      return { ok: true, withdrawalId: withdrawal.rows[0].id, netAmount: value - fee, fee };
    });
    return response.json(result);
  } catch (error) {
    return next(error);
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
    const [profile, referrals, income, settings] = await Promise.all([
      query<{ referral_code: string }>("SELECT referral_code FROM profiles WHERE id=$1", [user.id]),
      query<{ id: string; email: string; level: number; vip_level: number }>(
        `SELECT p.id,p.email,p.vip_level,r.level FROM referrals r
         JOIN profiles p ON p.id=r.referred_id WHERE r.referrer_id=$1
         ORDER BY r.created_at DESC`,
        [user.id],
      ),
      query<{ level: number; total: string }>(
        "SELECT level,COALESCE(SUM(amount),0) AS total FROM referral_commissions WHERE referrer_id=$1 GROUP BY level",
        [user.id],
      ),
      query<{ key: string; value: string }>(
        "SELECT key,value FROM platform_settings WHERE key IN ('referral_rate_l1','referral_rate_l2','referral_rate_l3')",
      ),
    ]);
    const rates = settingsMap(settings.rows);
    const levels = [1, 2, 3].map((level) => ({
      level,
      members: referrals.rows.filter((member) => member.level === level).length,
      earnings: number(income.rows.find((row) => row.level === level)?.total),
      rewardRate: number(rates[`referral_rate_l${level}`]),
    }));
    const total = levels.reduce((sum, level) => sum + level.earnings, 0);
    const code = profile.rows[0]?.referral_code ?? "";
    response.json({
      referralCode: code,
      referralLink: code ? `/?ref=${encodeURIComponent(code)}` : "",
      totalMembers: referrals.rows.length,
      teamIncome: total,
      teamRewards: total,
      levels,
      members: referrals.rows.map((member) => ({
        id: member.id,
        email: member.email,
        level: member.level,
        vipLevel: member.vip_level,
      })),
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

app.get("/api/admin/users", async (request, response, next) => {
  try {
    const rawPage = request.query.page;
    const rawSearch = request.query.search;
    if (
      (rawPage !== undefined &&
        (typeof rawPage !== "string" || !/^[1-9]\d*$/.test(rawPage))) ||
      (rawSearch !== undefined && typeof rawSearch !== "string")
    ) {
      response.status(400).json({ message: "INVALID_USERS_QUERY" });
      return;
    }
    const page = rawPage === undefined ? 1 : Number(rawPage);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) {
      response.status(400).json({ message: "INVALID_USERS_PAGE" });
      return;
    }

    const search = (typeof rawSearch === "string" ? rawSearch : "").trim();
    if (search.length > 100) {
      response.status(400).json({ message: "SEARCH_TOO_LONG" });
      return;
    }
    const escapedSearch = search.replace(/[\\%_]/g, "\\$&");
    const searchPattern = `%${escapedSearch}%`;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;
    const [totalResult, pageResult] = await Promise.all([
      query<{ total: string }>(
        `SELECT count(*)::text AS total
         FROM profiles p
         WHERE $1::text = '' OR p.username ILIKE $2 OR p.email ILIKE $2 OR p.referral_code ILIKE $2`,
        [search, searchPattern],
      ),
      query(
        `WITH current_page AS MATERIALIZED (
           SELECT p.id,p.username,p.email,p.phone,p.referral_code,p.vip_level,p.trial_active,p.is_blocked,p.created_at,
                  w.balance,w.total_deposited,w.total_withdrawn,w.invested_balance,w.team_income
           FROM profiles p
           LEFT JOIN wallets w ON w.user_id=p.id
           WHERE $1::text = '' OR p.username ILIKE $2 OR p.email ILIKE $2 OR p.referral_code ILIKE $2
           ORDER BY p.created_at DESC,p.id DESC
           LIMIT $3 OFFSET $4
         ),
         page_referrals AS (
           SELECT r.referrer_id,count(*) AS team_count
           FROM referrals r
           WHERE r.referrer_id IN (SELECT id FROM current_page)
           GROUP BY r.referrer_id
         )
         SELECT p.*,COALESCE(r.team_count, 0)::int AS team_count
         FROM current_page p
         LEFT JOIN page_referrals r ON r.referrer_id=p.id
         ORDER BY p.created_at DESC,p.id DESC`,
        [search, searchPattern, pageSize, offset],
      ),
    ]);
    response.json({
      items: pageResult.rows.map((row) => ({
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
      total: Number(totalResult.rows[0]?.total ?? 0),
      page,
      pageSize,
    });
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
        screenshotUrl: row.proof_id ? `/api/admin/deposits/${row.id}/proof` : null,
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

app.get("/api/admin/deposits/:depositId/proof", async (request, response, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(request.params.depositId))
      return response.status(400).json({ message: "INVALID_DEPOSIT_ID" });
    const result = await query<{ object_key: string }>(
      `SELECT proof.object_key FROM deposits deposit
       JOIN deposit_proofs proof ON proof.id=deposit.proof_id AND proof.user_id=deposit.user_id
       WHERE deposit.id=$1`,
      [request.params.depositId],
    );
    if (!result.rowCount) return response.status(404).json({ message: "DEPOSIT_PROOF_NOT_FOUND" });
    const signedUrl = await createDepositProofReadUrl(result.rows[0].object_key);
    return response.redirect(302, signedUrl);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/deposits/review", async (request, response, next) => {
  try {
    const admin = (request as express.Request & { authUser: { id: string } }).authUser;
    const { depositId, action, rejectReason } = request.body ?? {};
    if (
      typeof depositId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(depositId) ||
      !["approve", "reject"].includes(action) ||
      (rejectReason != null && (typeof rejectReason !== "string" || rejectReason.length > 500))
    )
      return response.status(400).json({ ok: false, reason: "INVALID_REVIEW_REQUEST" });
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
        await changeBalance(
          client,
          deposit.rows[0].user_id,
          number(deposit.rows[0].amount),
          "deposit",
          "اعتماد طلب الإيداع",
          depositId,
        );
        const referralRows = await client.query<{ referrer_id: string; level: number }>(
          "SELECT referrer_id,level FROM referrals WHERE referred_id=$1 AND level BETWEEN 1 AND 3",
          [deposit.rows[0].user_id],
        );
        const rates = await client.query<{ key: string; value: string }>(
          "SELECT key,value FROM platform_settings WHERE key IN ('referral_rate_l1','referral_rate_l2','referral_rate_l3')",
        );
        const rateByKey = settingsMap(rates.rows);
        for (const referral of referralRows.rows) {
          const rate = Number(rateByKey[`referral_rate_l${referral.level}`] ?? 0);
          if (!Number.isFinite(rate) || rate <= 0 || rate > 100) continue;
          const amount = Math.round((number(deposit.rows[0].amount) * rate * 10000) / 100) / 10000;
          if (amount <= 0) continue;
          await client.query(
            `INSERT INTO referral_commissions
             (referrer_id,referred_id,source_transaction_id,level,amount)
             VALUES ($1,$2,NULL,$3,$4)`,
            [referral.referrer_id, deposit.rows[0].user_id, referral.level, amount],
          );
          await changeBalance(client, referral.referrer_id, amount, "referral_reward", "مكافأة إحالة");
          await client.query(
            "UPDATE wallets SET team_income=team_income+$1 WHERE user_id=$2",
            [amount, referral.referrer_id],
          );
        }
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
    return next(error);
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
    const nameAr = String(data.nameAr ?? data.name_ar ?? "").trim();
    const nameEn = String(data.nameEn ?? data.name_en ?? "").trim();
    const taglineValue = data.taglineAr ?? data.tagline_ar;
    const taglineAr = taglineValue == null ? null : String(taglineValue).trim();
    const durationDays = Number(data.durationDays ?? data.duration_days);
    const profitPercent = Number(data.profitPercent ?? data.profit_percent);
    const minAmount = Number(data.minAmount ?? data.min_amount ?? 5);
    const code = String(data.code ?? "").trim();
    const id = data.id == null ? null : String(data.id);
    const accent = String(data.accent ?? "blue").trim();
    const isActiveValue = data.isActive ?? data.is_active ?? true;
    if (
      !nameAr ||
      !nameEn ||
      nameAr.length > 200 ||
      nameEn.length > 200 ||
      (taglineAr != null && taglineAr.length > 500) ||
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      !Number.isFinite(profitPercent) ||
      profitPercent < 0 ||
      profitPercent > 9999.9999 ||
      !Number.isFinite(minAmount) ||
      minAmount < 0 ||
      minAmount > 99999999999999 ||
      !accent ||
      accent.length > 50 ||
      typeof isActiveValue !== "boolean" ||
      (id != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) ||
      (id == null && !/^[a-z0-9][a-z0-9_-]{1,49}$/i.test(code))
    ) {
      return response.status(400).json({ message: "INVALID_FUND_DATA" });
    }
    if (data.id) {
      const result = await query(
        "UPDATE investment_funds SET name_ar=$1,name_en=$2,tagline_ar=$3,duration_days=$4,profit_percent=$5,min_amount=$6,accent=$7,is_active=$8 WHERE id=$9 RETURNING *",
        [
          nameAr,
          nameEn,
          taglineAr,
          durationDays,
          profitPercent,
          minAmount,
          accent,
          isActiveValue,
          id,
        ],
      );
      if (!result.rowCount) return response.status(404).json({ message: "FUND_NOT_FOUND" });
      return response.json({ ok: true, fund: result.rows[0] });
    } else {
      const result = await query(
        "INSERT INTO investment_funds (code,name_ar,name_en,tagline_ar,duration_days,profit_percent,min_amount,accent,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,99) RETURNING *",
        [
          code,
          nameAr,
          nameEn,
          taglineAr,
          durationDays,
          profitPercent,
          minAmount,
          accent,
        ],
      );
      return response.json({ ok: true, fund: result.rows[0] });
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return response.status(409).json({ message: "FUND_CODE_ALREADY_EXISTS" });
    return next(error);
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
    const id = data.id == null || data.id === "" ? null : String(data.id);
    let level: number;
    if (data.level == null || data.level === "") {
      if (id) {
        const existing = await query<{ level: number }>(
          "SELECT level FROM vip_packages WHERE id=$1",
          [id],
        );
        if (!existing.rows[0]) return response.status(404).json({ message: "VIP_PACKAGE_NOT_FOUND" });
        level = Number(existing.rows[0].level);
      } else {
        const nextLevel = await query<{ level: number }>(
          "SELECT COALESCE(MAX(level), 0) + 1 AS level FROM vip_packages",
        );
        level = Number(nextLevel.rows[0]?.level);
      }
    } else {
      level = Number(data.level);
    }
    const name = String(data.name ?? "").trim();
    const price = Number(data.price);
    const dailyProfit = Number(data.dailyProfit ?? data.daily_profit);
    const dailyTasks = Number(data.dailyTasks ?? data.daily_tasks);
    const taskReward = Number(data.taskReward ?? data.task_reward);
    const durationDays = Number(data.durationDays ?? data.duration_days ?? 365);
    const accent = String(data.accent ?? "blue").trim();
    const isActive = data.isActive ?? data.is_active ?? true;
    const validId =
      id == null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (
      !validId ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > 32767 ||
      !name ||
      name.length > 200 ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 99999999999999 ||
      !Number.isFinite(dailyProfit) ||
      dailyProfit < 0 ||
      dailyProfit > 99999999999999 ||
      !Number.isInteger(dailyTasks) ||
      dailyTasks < 0 ||
      dailyTasks > 32767 ||
      !Number.isFinite(taskReward) ||
      taskReward < 0 ||
      taskReward > 99999999999999 ||
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      durationDays > 32767 ||
      !accent ||
      accent.length > 50 ||
      typeof isActive !== "boolean"
    ) {
      return response.status(400).json({ message: "INVALID_VIP_PACKAGE_DATA" });
    }
    if (id) {
      const result = await query(
        `UPDATE vip_packages SET level=$1,name=$2,price=$3,daily_profit=$4,daily_tasks=$5,
         task_reward=$6,duration_days=$7,accent=$8,is_active=$9 WHERE id=$10 RETURNING *`,
        [level, name, price, dailyProfit, dailyTasks, taskReward, durationDays, accent, isActive, id],
      );
      if (!result.rowCount) return response.status(404).json({ message: "VIP_PACKAGE_NOT_FOUND" });
      return response.json({ ok: true, package: result.rows[0] });
    } else {
      const result = await query(
        `INSERT INTO vip_packages (level,name,price,daily_profit,daily_tasks,task_reward,duration_days,accent,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [level, name, price, dailyProfit, dailyTasks, taskReward, durationDays, accent, isActive],
      );
      return response.json({ ok: true, package: result.rows[0] });
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return response.status(409).json({ message: "VIP_PACKAGE_LEVEL_ALREADY_EXISTS" });
    return next(error);
  }
});

app.post("/api/admin/vip-packages/delete", async (request, response, next) => {
  try {
    const id = String(request.body?.id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return response.status(400).json({ message: "INVALID_VIP_PACKAGE_ID" });
    const result = await query("DELETE FROM vip_packages WHERE id=$1", [id]);
    if (!result.rowCount) return response.status(404).json({ message: "VIP_PACKAGE_NOT_FOUND" });
    return response.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === "23503")
      return response.status(409).json({ message: "VIP_PACKAGE_IN_USE" });
    return next(error);
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
    if (!settings || typeof settings !== "object" || Array.isArray(settings))
      return response.status(400).json({ message: "INVALID_SETTINGS" });
    const fixedReferralRates: Record<string, number> = {
      referral_rate_l1: 8,
      referral_rate_l2: 4,
      referral_rate_l3: 1,
    };
    const fixedDepositAddresses: Record<string, string> = {
      deposit_address_TRC20: "THT9uwaJnzjFXxjcq8mDfioEb4xNPjnGP6",
      deposit_address_ERC20: "0x2b84FD5e05E11148Bc600Df7060a506f3D0E682b",
      deposit_address_BEP20: "0x2b84FD5e05E11148Bc600Df7060a506f3D0E682b",
    };
    for (const [key, value] of Object.entries(settings)) {
      if (
        Object.hasOwn(fixedReferralRates, key) &&
        (value === "" || value === null || Number(value) !== fixedReferralRates[key])
      )
        return response.status(400).json({ message: "REFERRAL_RATES_ARE_FIXED" });
      if (
        Object.hasOwn(fixedDepositAddresses, key) &&
        value !== fixedDepositAddresses[key]
      )
        return response.status(400).json({ message: "DEPOSIT_ADDRESSES_ARE_FIXED" });
      if (key === "daily_spins" && (!Number.isInteger(Number(value)) || Number(value) < 0))
        return response.status(400).json({ message: "INVALID_VIP_SPIN_CHANCES" });
      if (key === "platform_timezone") {
        if (typeof value !== "string" || !value.trim())
          return response.status(400).json({ message: "INVALID_PLATFORM_TIMEZONE" });
        const timezone = await query("SELECT 1 FROM pg_timezone_names WHERE name=$1", [value]);
        if (!timezone.rowCount)
          return response.status(400).json({ message: "INVALID_PLATFORM_TIMEZONE" });
      }
    }
    await withTransaction(async (client) => {
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          "INSERT INTO platform_settings (key,value,is_public) VALUES ($1,$2,true) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
          [key, String(value)],
        );
      }
    });
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
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
    console.warn(
      "⚠️ No POSTGRES_URL or DATABASE_URL provided. Database features will be unavailable until configured.",
    );
    return;
  }
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const sqlPath = path.resolve(here, "../migrations/001_init.sql");
    try {
      const sql = await fs.readFile(sqlPath, "utf8");
      await query(sql);
      console.log("✅ Database schema initialized from 001_init.sql");
    } catch (migErr) {
      console.warn("⚠️ Migration notice:", migErr);
    }

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
      logger.info("Primary admin created");
    } else if (adminId) {
      await query(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT (user_id, role) DO NOTHING",
        [adminId],
      );
      await query(
        "INSERT INTO admin_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [adminId],
      );
      logger.info("Primary admin verified");
    } else {
      logger.warn("Primary admin was not bootstrapped: set ADMIN_PASSWORD to create one");
    }

    // Ensure default user exists
    const userEmail = (process.env.USER_EMAIL || "user@valoriza.com").trim().toLowerCase();
    const userPassword = process.env.USER_PASSWORD || "ValorizaUser2025!";
    const userCheck = await query("SELECT id FROM users WHERE email = $1", [userEmail]);
    if (!userCheck.rowCount) {
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
      console.log(`👤 Default user created: ${userEmail}`);
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

    // Seed default platform settings if empty
    const settingsCount = await query("SELECT count(*)::int as count FROM platform_settings");
    if ((settingsCount.rows[0]?.count ?? 0) === 0) {
      const settings: [string, string, string, boolean][] = [
        ["min_deposit", "10", "الحد الأدنى للإيداع بالدولار", true],
        ["min_withdrawal", "6", "الحد الأدنى للسحب بالدولار", true],
        ["withdrawal_fee_percent", "10", "نسبة رسوم السحب", true],
        ["withdrawal_start_hour", "09:00", "بداية وقت السحب", true],
        ["withdrawal_end_hour", "16:00", "نهاية وقت السحب", true],
        ["withdrawals_enabled", "true", "تفعيل السحب", true],
        ["min_investment", "5", "الحد الأدنى للاستثمار", true],
        ["daily_login_reward", "0.11", "مكافأة تسجيل الدخول اليومية", true],
        ["referral_rate_l1", "8", "عمولة المستوى الأول", true],
        ["referral_rate_l2", "4", "عمولة المستوى الثاني", true],
        ["referral_rate_l3", "1", "عمولة المستوى الثالث", true],
        ["daily_spins", "3", "فرص عجلة الحظ عند تفعيل VIP", true],
        ["platform_timezone", "UTC", "المنطقة الزمنية للمنصة", true],
        ["deposit_address_TRC20", "THT9uwaJnzjFXxjcq8mDfioEb4xNPjnGP6", "عنوان إيداع USDT TRC20", true],
        ["deposit_address_ERC20", "0x2b84FD5e05E11148Bc600Df7060a506f3D0E682b", "عنوان إيداع USDT ERC20", true],
        ["deposit_address_BEP20", "0x2b84FD5e05E11148Bc600Df7060a506f3D0E682b", "عنوان إيداع USDT BEP20", true],
      ];
      for (const setting of settings) {
        await query(
          `INSERT INTO platform_settings (key, value, description_ar, is_public)
           VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING`,
          setting,
        );
      }
    }
  } catch (err) {
    console.error("❌ initDatabase error:", err);
  }
}

// Schema is applied to development explicitly, never during startup.
// No default financial values or accounts are inserted from the reference design.
export default app;
