import { buildApiUrl, getStoredToken, setStoredToken } from "@/lib/backend-client";

export type AuthUser = {
  id: string;
  email: string;
  username?: string;
  role?: string;
};

type AuthListener = (event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED", session: unknown) => void;

const listeners = new Set<AuthListener>();

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

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.message ||
        (response.status === 401
          ? "INVALID_CREDENTIALS"
          : response.status === 403
            ? "ACCOUNT_BLOCKED"
            : response.status === 409
              ? "ACCOUNT_EXISTS"
              : `فشل الطلب (${response.status})`);
      return { data: null, error: new Error(message) };
    }

    return { data: data as T, error: null };
  } catch (networkError: unknown) {
    // Return friendly error object rather than crashing with unhandled rejection
    const msg = networkError instanceof Error ? networkError.message : "NETWORK_ERROR";
    return { data: null, error: new Error(msg) };
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
    const result = await request<{ session: { user: AuthUser } }>("/api/auth/session");
    if (!result.error && result.data?.session?.user) {
      return { data: { user: result.data.session.user }, error: null };
    }
    return { data: null, error: result.error || new Error("No user found") };
  },

  async signInWithPassword(input: { email: string; password?: string }) {
    const cleanEmail = (input.email || "").trim().toLowerCase();
    const password = input.password || "";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { data: null, error: new Error("يرجى إدخال بريد إلكتروني صالح.") };
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
      listeners.forEach((listener) => listener("SIGNED_IN", remoteResult.data));
      return { data: { session: remoteResult.data, user: remoteResult.data.user }, error: null };
    }
    
    return {
      data: null,
      error: remoteResult.error || new Error("بيانات الدخول غير صحيحة، يرجى التأكد من البريد الإلكتروني وكلمة المرور."),
    };
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }) {
    const cleanEmail = (input.email || "").trim().toLowerCase();
    const password = input.password || "";
    const metadata = input.options?.data ?? {};

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { data: null, error: new Error("يرجى إدخال بريد إلكتروني صالح.") };
    }
    if (password.length < 6) {
      return { data: null, error: new Error("كلمة المرور يجب أن لا تقل عن 6 أحرف.") };
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
        error: new Error("هذا البريد الإلكتروني مسجل بالفعل! يمكنك تسجيل الدخول مباشرة."),
      };
    }

    return remoteResult;
  },

  async signOut() {
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }).catch(() => ({}));
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
