export function backendBaseUrl() {
  const configured =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
    (typeof process !== "undefined" ? process.env?.BACKEND_URL : undefined);
  if (configured) return String(configured).replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:4000";
}

export function formatBackendUrl(path: string): string {
  const base = backendBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) {
    return cleanPath.startsWith("/api/") || cleanPath === "/api" ? cleanPath : `/api${cleanPath}`;
  }
  if (base.endsWith("/api")) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }
  const apiPath = cleanPath.startsWith("/api/") || cleanPath === "/api" ? cleanPath : `/api${cleanPath}`;
  return `${base}${apiPath}`;
}

export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

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
  const text = await response.text();
  let payload: any = {};
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { message: `خطأ في الاتصال بالخادم (${response.status})` };
  }
  if (!response.ok)
    throw new Error(payload.message || `خطأ في الخادم (${response.status})`);
  return payload as T;
}

export function browserBackendUrl() {
  return backendBaseUrl();
}
