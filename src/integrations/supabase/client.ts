import { buildApiUrl, getStoredToken, setStoredToken } from "@/lib/backend-client";

export type AuthUser = { id: string; email: string; username?: string; role?: string };
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

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });

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
    console.error(`[Valoriza Auth] Network error calling ${path}:`, networkError);
    const msg =
      networkError instanceof Error && networkError.message.includes("fetch")
        ? "تعذر الاتصال بخادم الباك إند. تأكد من تشغيل السيرفر على Render وصحة رابط VITE_BACKEND_URL"
        : networkError instanceof Error
          ? networkError.message
          : "تعذر الاتصال بالخادم";
    return { data: null, error: new Error(msg) };
  }
}

const auth = {
  async getSession() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    return { data: result.data ?? { session: null }, error: result.error };
  },

  async getUser() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    return { data: { user: result.data?.session?.user ?? null }, error: result.error };
  },

  async signInWithPassword(input: { email: string; password: string }) {
    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );

    if (!result.error && result.data?.token) {
      setStoredToken(result.data.token);
      listeners.forEach((listener) => listener("SIGNED_IN", result.data));
    }
    return result;
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }) {
    const metadata = input.options?.data ?? {};
    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          username: metadata.username,
          phone: metadata.phone,
          referralCode: metadata.referral_code,
        }),
      },
    );

    if (!result.error && result.data?.token) {
      setStoredToken(result.data.token);
      listeners.forEach((listener) => listener("SIGNED_IN", result.data));
    }
    return result;
  },

  async signOut() {
    const result = await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    setStoredToken(null);
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return result;
  },

  async updateUser(input: { password?: string }) {
    const result = await request<{ user: AuthUser }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!result.error) {
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
