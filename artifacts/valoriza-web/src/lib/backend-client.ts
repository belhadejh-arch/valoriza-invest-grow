import { localizeResponse } from "./legacy-i18n";
import { getStoredToken, invalidateSession } from "./session-token";
import { BackendRequestError } from "./request-errors";
export { getStoredToken, setStoredToken } from "./session-token";

export function hasConfiguredBackend(): boolean {
  return true;
}

export function backendBaseUrl(): string {
  // In browser, relative to current origin (Vite proxies /api to port 4000)
  if (typeof window !== "undefined") {
    return "";
  }

  // In Node/SSR server default to local express port
  return process.env.VITE_BACKEND_URL || "http://127.0.0.1:4000";
}

export function buildApiUrl(path: string): string {
  const base = backendBaseUrl();
  const rawPath = path.startsWith("/") ? path : `/${path}`;
  // Ensure the route starts with /api
  const apiPath = rawPath.startsWith("/api/") || rawPath === "/api" ? rawPath : `/api${rawPath}`;

  if (!base) {
    return apiPath;
  }
  return `${base}${apiPath}`;
}

export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const sentToken = headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? token;

  const url = buildApiUrl(path);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const code = typeof data?.message === "string" ? data.message : "SERVICE_UNAVAILABLE";
      if (response.status === 401 && code === "UNAUTHORIZED") invalidateSession(sentToken);
      throw new BackendRequestError(
        response.status >= 500 && code !== "DAILY_REWARD_UNAVAILABLE" ? "SERVICE_UNAVAILABLE" : code,
        response.status,
      );
    }
    if (data === null) throw new BackendRequestError("SERVICE_UNAVAILABLE", response.status);
    return localizeResponse(data) as T;
  } catch (error) {
    if (error instanceof BackendRequestError) throw error;
    // Do not retry mutations: an interrupted response can follow a committed credit.
    throw new BackendRequestError("SERVICE_UNAVAILABLE", 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function browserBackendUrl() {
  return backendBaseUrl();
}
