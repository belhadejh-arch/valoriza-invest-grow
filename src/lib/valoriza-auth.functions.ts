import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  role?: string;
}

export interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export const serverAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  return serverBackendRequest<{ session: { user: AuthUser } | null }>("/api/auth/session");
});

export const serverAuthLogin = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    return serverBackendRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

export const serverAuthRegister = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      password: string;
      username?: string;
      phone?: string;
      referralCode?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return serverBackendRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

export const serverAuthLogout = createServerFn({ method: "POST" }).handler(async () => {
  return serverBackendRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
});

export const serverAuthUpdatePassword = createServerFn({ method: "POST" })
  .validator((data: { password?: string }) => data)
  .handler(async ({ data }) => {
    return serverBackendRequest<{ user: AuthUser }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });
