import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { query } from "./db.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("JWT_SECRET or SESSION_SECRET must be configured.");
  return secret;
}
const JWT_SECRET = getJwtSecret();

const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? 30);
export const SESSION_COOKIE = "valoriza_session";

const EMAIL_FORMAT_CODEPOINT_RANGES: Array<[number, number]> = [
  [0x00ad, 0x00ad],
  [0x034f, 0x034f],
  [0x061c, 0x061c],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0x110bd, 0x110bd],
  [0x110cd, 0x110cd],
  [0x13430, 0x1343f],
  [0x1bca0, 0x1bca3],
  [0x1d173, 0x1d17a],
  [0xe0001, 0xe0001],
  [0xe0020, 0xe007f],
];

export const EMAIL_FORMAT_CHARACTERS = EMAIL_FORMAT_CODEPOINT_RANGES
  .flatMap(([start, end]) =>
    Array.from({ length: end - start + 1 }, (_, index) => String.fromCodePoint(start + index)),
  )
  .join("");

export function normalizeEmail(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\p{Cf}\u034F]/gu, "")
    .trim()
    .toLowerCase();
}

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
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
}

function requestToken(request: Request): string | undefined {
  // The browser explicitly sends its current token. An older proxy cookie
  // must never override it or silently select a different account.
  return request.header("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1]
    || request.cookies?.[SESSION_COOKIE];
}

export async function createSession(userId: string, response: Response) {
  const token = jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` },
  );
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [userId, hashToken(token), SESSION_DAYS],
  );
  setSessionCookie(response, token);
  return token;
}

export async function destroySession(request: Request, response: Response) {
  const token = requestToken(request);
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  clearSessionCookie(response);
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token = requestToken(request);
  if (!token) return null;
  let userId: string;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }
  // A database outage is a service error, not an invalid password/session.
  const result = await query<AuthUser>(
      `SELECT u.id, u.email, p.username,
              CASE
                WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = u.id AND role = 'admin')
                  OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = u.id)
                THEN 'admin'
                ELSE COALESCE(
                  (SELECT role FROM user_roles WHERE user_id = u.id ORDER BY role = 'admin' DESC LIMIT 1),
                  'user'
                )
              END AS role
       FROM users u JOIN profiles p ON p.id = u.id
       JOIN sessions s ON s.user_id = u.id
       WHERE u.id = $1 AND s.token_hash = $2 AND s.expires_at > now()`,
      [userId, hashToken(token)],
    );
  return result.rows[0] ?? null;
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
