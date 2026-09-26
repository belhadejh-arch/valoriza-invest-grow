export function buildApiUrl(path: string): string {
  const rawPath = path.startsWith("/") ? path : `/${path}`;
  // Ensure the route starts with /api
  const apiPath = rawPath.startsWith("/api/") || rawPath === "/api" ? rawPath : `/api${rawPath}`;
  return apiPath;
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
  timeoutMs = 10_000,
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
  // Ensure we don't prematurely abort longer requests like saves
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.ok) {
    const payload = (await response.json().catch(() => ({}))) as T;
    return payload;
  }
  
  // Throw for UI to handle rather than falling back
  throw new Error(`API request failed: ${response.status} ${response.statusText}`);
}

export function browserBackendUrl() {
  return "";
}
