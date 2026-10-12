const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim().replace(/\/+$/, "");

export function hasConfiguredBackend(): boolean {
  // The Replit API service is mounted on the same origin under /api.
  return typeof window !== "undefined" || Boolean(configuredBackendUrl);
}

export function backendBaseUrl(): string {
  // When explicitly configured, send browser requests to the chosen API
  // service. Otherwise use the deployment's same-origin /api proxy.
  if (typeof window !== "undefined") {
    return configuredBackendUrl || "";
  }

  // In Node/SSR server default to local express port
  return configuredBackendUrl || process.env.VITE_BACKEND_URL || "http://127.0.0.1:8080";
}

function sessionTokenKey(): string {
  const backendUrl = backendBaseUrl();
  if (!backendUrl) return "valoriza_session_token";

  try {
    return `valoriza_session_token:${new URL(backendUrl).origin}`;
  } catch {
    return "valoriza_session_token";
  }
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

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(sessionTokenKey());
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = sessionTokenKey();
    if (token) {
      localStorage.setItem(key, token);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage access errors
  }
}

export async function backendRequest<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const url = buildApiUrl(path);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const errorMsg = (data as any)?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export function browserBackendUrl() {
  return backendBaseUrl();
}
