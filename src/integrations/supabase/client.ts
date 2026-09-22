import { formatBackendUrl } from "@/lib/backend-client";

type AuthUser = { id: string; email: string; username?: string; role?: string };
type AuthListener = (event: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED", session: unknown) => void;

const listeners = new Set<AuthListener>();

async function request<T>(path: string, init: RequestInit = {}) {
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
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  return {
    data: data as T,
    error: response.ok ? null : new Error(data?.message || "Backend request failed"),
  };
}

const auth = {
  async getSession() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    return { data: result.data || { session: null }, error: result.error };
  },
  async getUser() {
    const result = await request<{ session: { user: AuthUser } | null }>("/api/auth/session");
    return { data: { user: result.data?.session?.user ?? null }, error: result.error };
  },
  async signInWithPassword(input: { email: string; password: string }) {
    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!result.error) {
      if (result.data?.token && typeof window !== "undefined") {
        localStorage.setItem("valoriza_token", result.data.token);
      }
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
    const result = await request<{ ok: boolean; token?: string; user?: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        username: metadata.username,
        phone: metadata.phone,
        referralCode: metadata.referral_code,
      }),
    });
    if (!result.error) {
      if (result.data?.token && typeof window !== "undefined") {
        localStorage.setItem("valoriza_token", result.data.token);
      }
      listeners.forEach((listener) => listener("SIGNED_IN", result.data));
    }
    return result;
  },
  async signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("valoriza_token");
    }
    const result = await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return result;
  },
  async updateUser(input: { password?: string }) {
    const result = await request<{ user: AuthUser }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!result.error) listeners.forEach((listener) => listener("USER_UPDATED", result.data));
    return result;
  },
  onAuthStateChange(listener: AuthListener) {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  },
};

export const supabase = { auth };
