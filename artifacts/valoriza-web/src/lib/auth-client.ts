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
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    const token = getStoredToken();
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch(buildApiUrl(path), {
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
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("NETWORK_ERROR"),
    };
  }
}

export const auth = {
  async getSession() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    return {
      data: { session: result.data?.session ?? null },
      error: result.error,
    };
  },

  async getUser() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    return {
      data: { user: result.data?.session?.user ?? null },
      error: result.error,
    };
  },

  async signInWithPassword(input: { email: string; password: string }) {
    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
      },
    );
    if (!result.error && result.data?.ok && result.data.user) {
      if (result.data.token) setStoredToken(result.data.token);
      listeners.forEach((listener) => listener("SIGNED_IN", result.data));
    }
    return result;
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }) {
    const email = input.email.trim().toLowerCase();
    const metadata = input.options?.data ?? {};
    if (!email || !email.includes("@")) {
      return { data: null, error: new Error("يرجى إدخال بريد إلكتروني صالح.") };
    }
    if (input.password.length < 6) {
      return { data: null, error: new Error("كلمة المرور يجب أن لا تقل عن 6 أحرف.") };
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
    if (!result.error && result.data?.ok && result.data.user) {
      if (result.data.token) setStoredToken(result.data.token);
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
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
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
