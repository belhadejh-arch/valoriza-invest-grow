export function backendBaseUrl(): string {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
    (typeof process !== "undefined"
      ? process.env?.BACKEND_URL || process.env?.VITE_BACKEND_URL
      : undefined);

  if (configured) {
    // Strip trailing slash and trailing /api if present so URL building is deterministic
    return String(configured)
      .replace(/\/+$/, "")
      .replace(/\/api$/, "");
  }

  // In browser, relative to current host
  if (typeof window !== "undefined") {
    return "";
  }

  // In Node/SSR server default to local express port
  return "http://localhost:4000";
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

import { routeFallbackResponse } from "./mock-data";

export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const url = buildApiUrl(path);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const payload = (await response.json().catch(() => ({}))) as T;
      return payload;
    }
  } catch {
    // Network failure / offline backend fallback
  }

  return routeFallbackResponse(path, init) as T;
}

export function browserBackendUrl() {
  return backendBaseUrl();
}
