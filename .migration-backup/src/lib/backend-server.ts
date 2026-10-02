import { createServerOnlyFn } from "@tanstack/react-start";
import { buildApiUrl } from "./backend-client";

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const errorMsg =
      (payload as any)?.message || `Server backend request failed: ${response.status}`;
    throw new Error(errorMsg);
  }
  return payload;
}
