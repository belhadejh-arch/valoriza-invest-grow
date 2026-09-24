import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { query } from "./db.js";

const JWT_SECRET: string = process.env.JWT_SECRET || process.env.SESSION_SECRET || "";
if (!JWT_SECRET) throw new Error("SESSION_SECRET is required");

const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? 30);
export const SESSION_COOKIE = "valoriza_session";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: "admin" | "moderator" | "user";
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function createSession(userId: string, response: Response) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [userId, hashToken(token), SESSION_DAYS],
  );
  setSessionCookie(response, token);
  return token;
}

export async function destroySession(request: Request, response: Response) {
  const token = request.cookies?.[SESSION_COOKIE];
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  clearSessionCookie(response);
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token =
    request.cookies?.[SESSION_COOKIE] || request.header("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (!payload.sub) return null;
    const result = await query<AuthUser>(
      `SELECT u.id, u.email, p.username,
              COALESCE((SELECT role FROM user_roles WHERE user_id = u.id ORDER BY role = 'admin' DESC LIMIT 1), 'user') AS role
       FROM users u JOIN profiles p ON p.id = u.id
       JOIN sessions s ON s.user_id = u.id
       WHERE u.id = $1 AND s.token_hash = $2 AND s.expires_at > now()`,
      [payload.sub, hashToken(token)],
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) {
    const error = new Error("UNAUTHORIZED");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (user.role !== "admin") {
    const error = new Error("FORBIDDEN");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  return user;
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
