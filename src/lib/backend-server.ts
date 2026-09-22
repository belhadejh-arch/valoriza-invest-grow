import { createServerOnlyFn } from "@tanstack/react-start";
import { formatBackendUrl } from "./backend-client";

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
  const response = await fetch(formatBackendUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok)
    throw new Error(payload.message || `Backend request failed (${response.status})`);
  return payload;
}
