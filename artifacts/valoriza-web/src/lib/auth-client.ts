import { buildApiUrl, getStoredToken, setStoredToken } from "@/lib/backend-client";
import { createSessionReader } from "./auth-session-cache";
import { invalidateSession, onSessionInvalidated } from "./session-token";

export type AuthUser = {
  id: string;
  email: string;
  username?: string;
  role?: string;
};

type AuthListener = (event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "SESSION_EXPIRED", session: unknown) => void;
const listeners = new Set<AuthListener>();

function normalizeEmail(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\p{Cf}\u034F]/gu, "")
    .trim()
    .toLowerCase();
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    const token = getStoredToken();
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);
    let response: Response;
    try {
      response = await fetch(buildApiUrl(path), {
        ...init,
        headers,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return { data: null, error: new Error("AUTH_UNAVAILABLE") };
    }
    if (!response.ok) {
      if (response.status === 401 && data.message === "UNAUTHORIZED") invalidateSession(token);
      const message =
        response.status >= 500 || typeof data.message !== "string"
          ? "AUTH_UNAVAILABLE"
          : data.message;
      return { data: null, error: new Error(message) };
    }
    return { data: data as T, error: null };
  } catch {
    return {
      data: null,
      error: new Error("AUTH_UNAVAILABLE"),
    };
  }
}

const sessions = createSessionReader<AuthUser>(async () => {
  const token = getStoredToken();
  const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
  if (!result.error && (!result.data || !("session" in result.data))) {
    return { data: null, error: new Error("AUTH_UNAVAILABLE") };
  }
  if (!result.error && result.data?.session === null && token) invalidateSession(token);
  return result;
}, getStoredToken);

onSessionInvalidated(() => {
  sessions.clear();
  listeners.forEach((listener) => listener("SESSION_EXPIRED", null));
});

export const auth = {
  async getSession() {
    const result = await sessions.read();
    return {
      data: { session: result.data?.session ?? null },
      error: result.error,
    };
  },

  async getUser() {
    const result = await sessions.read();
    return {
      data: { user: result.data?.session?.user ?? null },
      error: result.error,
    };
  },

  async signInWithPassword(input: { email: string; password: string }) {
    sessions.clear();
    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(input.email),
          password: input.password,
        }),
      },
    );
    if (!result.error && (!result.data?.ok || !result.data.token || !result.data.user)) {
      return { data: null, error: new Error("AUTH_UNAVAILABLE") };
    }
    if (!result.error && result.data?.ok && result.data.user) {
      if (result.data.token) setStoredToken(result.data.token);
      sessions.prime(result.data.user);
      listeners.forEach((listener) => listener("SIGNED_IN", result.data));
    }
    return result;
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }) {
    sessions.clear();
    const email = normalizeEmail(input.email);
    const metadata = input.options?.data ?? {};
    if (!email || !email.includes("@")) {
      return { data: null, error: new Error("INVALID_EMAIL") };
    }
    if (!input.password.length) {
      return { data: null, error: new Error("PASSWORD_REQUIRED") };
    }
    if (new TextEncoder().encode(input.password).length > 72) {
      return { data: null, error: new Error("PASSWORD_TOO_LONG") };
    }

    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password: input.password,
          username: metadata.username,
          phone: metadata.phone,
          referralCode: metadata.referral_code,
        }),
      },
    );
    if (!result.error && (!result.data?.ok || !result.data.token || !result.data.user)) {
      return { data: null, error: new Error("AUTH_UNAVAILABLE") };
    }
    if (!result.error && result.data?.ok && result.data.user) {
      if (result.data.token) setStoredToken(result.data.token);
      sessions.prime(result.data.user);
      listeners.forEach((listener) => listener("SIGNED_IN", result.data));
    } else if (
      result.error &&
      (result.error.message === "ACCOUNT_EXISTS" || result.error.message.includes("مسجل بالفعل"))
    ) {
      return {
        data: null,
        error: new Error("هذا البريد الإلكتروني مسجل بالفعل! يمكنك تسجيل الدخول مباشرة."),
      };
    }
    return result;
  },

  async signOut() {
    sessions.clear();
    const result = await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    if (result.error) return result;
    if (!result.data?.ok) return { data: null, error: new Error("AUTH_UNAVAILABLE") };
    setStoredToken(null);
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return { data: { ok: true }, error: null };
  },

  async updateUser(input: { password?: string }) {
    const result = await request<{ user: AuthUser }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!result.error && result.data?.user) {
      sessions.clear();
      listeners.forEach((listener) => listener("USER_UPDATED", result.data));
    }
    return result;
  },

  onAuthStateChange(listener: AuthListener) {
    listeners.add(listener);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(listener);
          },
        },
      },
    };
  },
};
