import crypto from "node:crypto";
import type { Request, Response } from "express";
import { logger } from "../lib/logger.js";
import { query } from "./db.js";
import { hashPassword } from "./auth.js";

const ADMIN_COOKIE = "valoriza_admin_session";
const ADMIN_SESSION_DAYS = 7;

export type AdminAccount = { id: string; email: string };

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function bootstrapAdminAccount() {
  const email = (process.env.ADMIN_EMAIL || "admin@valoriza.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    logger.warn("Separate admin access is not configured; set ADMIN_PASSWORD securely");
    return;
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }
  const existing = await query("SELECT id FROM admin_accounts WHERE lower(email) = $1", [email]);
  if (existing.rowCount) return;
  const passwordHash = await hashPassword(password);
  await query(
    `INSERT INTO admin_accounts (email, password_hash) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [email, passwordHash],
  );
  logger.info("Separate administrator account initialized");
}

export async function createAdminSession(id: string, response: Response) {
  const token = crypto.randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO admin_sessions (admin_account_id,token_hash,expires_at)
     VALUES ($1,$2,now() + interval '7 days')`,
    [id, hashToken(token)],
  );
  response.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
    maxAge: ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function getAdminAccount(request: Request): Promise<AdminAccount | null> {
  const token = request.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string" || !token) return null;
  const result = await query<AdminAccount>(
    `SELECT a.id,a.email FROM admin_accounts a
     JOIN admin_sessions s ON s.admin_account_id=a.id
     WHERE s.token_hash=$1 AND s.expires_at>now() AND a.is_active=true`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function requireAdminAccount(request: Request): Promise<AdminAccount> {
  const account = await getAdminAccount(request);
  if (!account) {
    const error = new Error("ADMIN_UNAUTHORIZED");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return account;
}

export async function destroyAdminSession(request: Request, response: Response) {
  const token = request.cookies?.[ADMIN_COOKIE];
  if (typeof token === "string" && token) {
    await query("DELETE FROM admin_sessions WHERE token_hash=$1", [hashToken(token)]);
  }
  response.clearCookie(ADMIN_COOKIE, { path: "/api/admin" });
}

export async function revokeOtherAdminSessions(request: Request, adminId: string) {
  const token = request.cookies?.[ADMIN_COOKIE];
  if (typeof token !== "string" || !token) return;
  await query(
    "DELETE FROM admin_sessions WHERE admin_account_id=$1 AND token_hash<>$2",
    [adminId, hashToken(token)],
  );
}