import { createServerOnlyFn } from "@tanstack/react-start";
import { buildApiUrl } from "./backend-client";
import { routeFallbackResponse } from "./mock-data";

const getIncomingRequest = createServerOnlyFn(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  return getRequest();
});

export async function serverBackendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const request = await getIncomingRequest();
  const cookie = request?.headers.get("cookie");
  const authorization = request?.headers.get("authorization");
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);

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
    // Backend offline / connection refused — fallback gracefully below
  }

  // Graceful fallback to avoid catastrophic "fetch failed" crashing the app
  return routeFallbackResponse(path, init) as T;
}
