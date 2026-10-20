import { backendRequest } from "./backend-client";

export async function serverBackendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return backendRequest<T>(path, init);
}
