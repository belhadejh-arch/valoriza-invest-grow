export function hasConfiguredBackend(): boolean {
  return Boolean(import.meta.env.VITE_BACKEND_URL);
}

export function backendBaseUrl(): string {
  // In browser, relative to current origin (Vite proxies /api to port 4000)
  if (typeof window !== "undefined") {
    return import.meta.env.VITE_BACKEND_URL || "";
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

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("valoriza_session_token");
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem("valoriza_session_token", token);
    } else {
      localStorage.removeItem("valoriza_session_token");
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
