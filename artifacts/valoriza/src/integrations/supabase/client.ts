import { buildApiUrl, getStoredToken, setStoredToken } from "@/lib/backend-client";

export type AuthUser = {
  id: string;
  email: string;
  username?: string;
  role?: string;
};

type AuthListener = (event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED", session: unknown) => void;

const listeners = new Set<AuthListener>();

const AUTH_USER_CACHE_TTL_MS = 15_000;

type AuthUserResult = { data: { user: AuthUser } | null; error: Error | null };

let verifiedAuthUser:
  | { token: string; user: AuthUser; verifiedAt: number }
  | null = null;
const authUserChecks = new Map<string, Promise<AuthUserResult>>();

function invalidateVerifiedAuthUser() {
  verifiedAuthUser = null;
  authUserChecks.clear();
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const url = buildApiUrl(path);
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const token = getStoredToken();
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        credentials: "include",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const knownCodes = new Set([
        "INVALID_CREDENTIALS",
        "ACCOUNT_BLOCKED",
        "ACCOUNT_EXISTS",
        "INVALID_REGISTRATION",
      ]);
      const message = knownCodes.has(data?.message)
        ? data.message
        : response.status === 401
          ? "INVALID_CREDENTIALS"
          : response.status === 403
            ? "ACCOUNT_BLOCKED"
            : response.status === 409
              ? "ACCOUNT_EXISTS"
              : response.status >= 500
                ? "SERVER_UNAVAILABLE"
                : "REQUEST_FAILED";
      return { data: null, error: new Error(message) };
    }

    return { data: data as T, error: null };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError" ? "NETWORK_TIMEOUT" : "NETWORK_ERROR";
    return { data: null, error: new Error(message) };
  }
}

const auth = {
  async getSession() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    if (!result.error && result.data?.session?.user) {
        return { data: { session: result.data.session }, error: null };
    }
    return { data: { session: null }, error: result.error };
  },

  async getUser() {
    const token = getStoredToken();
    if (!token) {
      const result = await request<{ session: { user: AuthUser } }>("/api/auth/session");
      if (result.error || !result.data?.session?.user) {
        invalidateVerifiedAuthUser();
        return { data: null, error: result.error || new Error("USER_NOT_FOUND") };
      }
      return { data: { user: result.data.session.user }, error: null };
    }

    if (
      verifiedAuthUser?.token === token &&
      Date.now() - verifiedAuthUser.verifiedAt < AUTH_USER_CACHE_TTL_MS
    ) {
      return { data: { user: verifiedAuthUser.user }, error: null };
    }

    const inFlight = authUserChecks.get(token);
    if (inFlight) return inFlight;

    const check = request<{ session: { user: AuthUser } }>("/api/auth/session").then((result) => {
      const user = result.data?.session?.user;
      if (!result.error && user) {
        if (getStoredToken() === token) {
          verifiedAuthUser = { token, user, verifiedAt: Date.now() };
        }
        return { data: { user }, error: null };
      }
      invalidateVerifiedAuthUser();
      return { data: null, error: result.error || new Error("USER_NOT_FOUND") };
    });
    authUserChecks.set(token, check);
    void check.finally(() => {
      if (authUserChecks.get(token) === check) authUserChecks.delete(token);
    });
    return check;
  },

  async signInWithPassword(input: { email: string; password?: string }) {
    invalidateVerifiedAuthUser();
    const cleanEmail = (input.email || "").trim().toLowerCase();
    const password = input.password || "";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { data: null, error: new Error("INVALID_EMAIL") };
    }

    const remoteResult = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password }),
      },
    );

    if (!remoteResult.error && remoteResult.data?.ok && remoteResult.data.user) {
      if (remoteResult.data.token) {
        setStoredToken(remoteResult.data.token);
      }
      invalidateVerifiedAuthUser();
      listeners.forEach((listener) => listener("SIGNED_IN", remoteResult.data));
      return { data: { session: remoteResult.data, user: remoteResult.data.user }, error: null };
    }
    
    return {
      data: null,
      error: remoteResult.error || new Error("INVALID_CREDENTIALS"),
    };
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }) {
    invalidateVerifiedAuthUser();
    const cleanEmail = (input.email || "").trim().toLowerCase();
    const password = input.password || "";
    const metadata = input.options?.data ?? {};

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { data: null, error: new Error("INVALID_EMAIL") };
    }
    if (password.length < 6) {
      return { data: null, error: new Error("PASSWORD_TOO_SHORT") };
    }

    const remoteResult = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail,
          password,
          username: metadata.username,
          phone: metadata.phone,
          referralCode: metadata.referral_code,
        }),
      },
    );

    if (!remoteResult.error && remoteResult.data?.ok && remoteResult.data.user) {
      if (remoteResult.data.token) {
        setStoredToken(remoteResult.data.token);
      }
      invalidateVerifiedAuthUser();
      listeners.forEach((listener) => listener("SIGNED_IN", remoteResult.data));
      return { data: { session: remoteResult.data, user: remoteResult.data.user }, error: null };
    }

    if (
      remoteResult.error &&
      (remoteResult.error.message === "ACCOUNT_EXISTS" ||
        remoteResult.error.message.includes("مسجل بالفعل"))
    ) {
      return {
        data: null,
        error: new Error("ACCOUNT_EXISTS"),
      };
    }

    return remoteResult;
  },

  async signOut() {
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }).catch(() => ({}));
    setStoredToken(null);
    invalidateVerifiedAuthUser();
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return { data: { ok: true }, error: null };
  },

  async updateUser(input: { password?: string }) {
    const result = await request<{ user: AuthUser }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!result.error && result.data?.user) {
      invalidateVerifiedAuthUser();
      listeners.forEach((listener) => listener("USER_UPDATED", result.data));
    }
    return result;
  },

  onAuthStateChange(listener: AuthListener) {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  },
};

export const supabase = { auth };
