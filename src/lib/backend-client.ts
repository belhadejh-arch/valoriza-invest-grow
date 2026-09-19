export function backendBaseUrl() {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
    (typeof process !== "undefined" ? process.env?.BACKEND_URL : undefined);
  if (configured) return String(configured).replace(/\/$/, "");
  if (typeof window !== "undefined") return "/api";
  throw new Error("VITE_BACKEND_URL or BACKEND_URL is required");
}

export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  const response = await fetch(`${backendBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok)
    throw new Error(payload.message || `Backend request failed (${response.status})`);
  return payload;
}

export function browserBackendUrl() {
  return backendBaseUrl();
}
