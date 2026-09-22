import {
  serverAuthSession,
  serverAuthLogin,
  serverAuthRegister,
  serverAuthLogout,
  serverAuthUpdatePassword,
  type AuthUser,
} from "@/lib/valoriza-auth.functions";
import { formatBackendUrl } from "@/lib/backend-client";

type AuthListener = (event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED", session: unknown) => void;
const listeners = new Set<AuthListener>();

function saveSession(token?: string) {
  if (typeof window !== "undefined" && token) {
    localStorage.setItem("valoriza_token", token);
    try {
      document.cookie = `valoriza_session=${token}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {
      // ignore
    }
  }
}

function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("valoriza_token");
    try {
      document.cookie = "valoriza_session=; path=/; max-age=0; SameSite=Lax";
    } catch {
      // ignore
    }
  }
}

async function requestFallback<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("valoriza_token");
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const url = formatBackendUrl(path);
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: `خطأ في الاتصال بالخادم (${response.status})` };
    }
    return {
      data: data as T,
      error: response.ok ? null : new Error(data?.message || `خطأ في الخادم (${response.status})`),
    };
  } catch (err: any) {
    return {
      data: {} as T,
      error: new Error(err?.message || "تعذر الاتصال بالخادم"),
    };
  }
}

const auth = {
  async getSession() {
    try {
      const data = await serverAuthSession();
      return { data: data || { session: null }, error: null };
    } catch {
      return requestFallback<{ session: { user: AuthUser } | null }>("/api/auth/session");
    }
  },

  async getUser() {
    try {
      const data = await serverAuthSession();
      return { data: { user: data?.session?.user ?? null }, error: null };
    } catch {
      const result = await requestFallback<{ session: { user: AuthUser } | null }>("/api/auth/session");
      return { data: { user: result.data?.session?.user ?? null }, error: result.error };
    }
  },

  async signInWithPassword(input: { email: string; password: string }) {
    try {
      const data = await serverAuthLogin({ data: input });
      if (data?.token) {
        saveSession(data.token);
      }
      listeners.forEach((listener) => listener("SIGNED_IN", data));
      return { data, error: null };
    } catch (err: any) {
      // Fallback direct request
      const fallback = await requestFallback<{ ok: boolean; token?: string; user?: AuthUser }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      if (!fallback.error && fallback.data?.token) {
        saveSession(fallback.data.token);
        listeners.forEach((listener) => listener("SIGNED_IN", fallback.data));
        return { data: fallback.data, error: null };
      }
      return { data: null, error: err?.message ? err : fallback.error };
    }
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }) {
    const metadata = input.options?.data ?? {};
    const payload = {
      email: input.email,
      password: input.password,
      username: metadata.username,
      phone: metadata.phone,
      referralCode: metadata.referral_code,
    };
    try {
      const data = await serverAuthRegister({ data: payload });
      if (data?.token) {
        saveSession(data.token);
      }
      listeners.forEach((listener) => listener("SIGNED_IN", data));
      return { data, error: null };
    } catch (err: any) {
      // Fallback direct request
      const fallback = await requestFallback<{ ok: boolean; token?: string; user?: AuthUser }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!fallback.error && fallback.data?.token) {
        saveSession(fallback.data.token);
        listeners.forEach((listener) => listener("SIGNED_IN", fallback.data));
        return { data: fallback.data, error: null };
      }
      return { data: null, error: err?.message ? err : fallback.error };
    }
  },

  async signOut() {
    clearSession();
    try {
      await serverAuthLogout();
    } catch {
      await requestFallback<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    }
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return { data: { ok: true }, error: null };
  },

  async updateUser(input: { password?: string }) {
    try {
      const data = await serverAuthUpdatePassword({ data: input });
      listeners.forEach((listener) => listener("USER_UPDATED", data));
      return { data, error: null };
    } catch (err: any) {
      return requestFallback<{ user: AuthUser }>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }
  },

  onAuthStateChange(listener: AuthListener) {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  },
};

export const supabase = { auth };
export type { AuthUser };
