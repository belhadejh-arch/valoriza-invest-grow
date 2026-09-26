import { backendRequest } from "@/lib/backend-client";

export type AdminSession = {
  id: string;
  email: string;
};

export const getAdminSession = () =>
  backendRequest<{ admin: AdminSession | null }>("/api/admin/auth/session");

export const loginAdmin = (email: string, password: string) =>
  backendRequest<{ ok: true; admin: AdminSession }>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logoutAdmin = () =>
  backendRequest<{ ok: true }>("/api/admin/auth/logout", { method: "POST" });

export function adminLoginErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const status = message.match(/API request failed:\s*(\d{3})/)?.[1];
  if (!status) return "admin.loginNetworkError";

  const code = Number(status);
  if (code === 401 || code === 400 || code === 422) return "admin.loginInvalidCredentials";
  if (code === 403) return "admin.loginForbidden";
  if (code === 429) return "admin.loginRateLimited";
  if (code >= 500) return "admin.loginServerError";
  return "admin.loginGenericError";
}