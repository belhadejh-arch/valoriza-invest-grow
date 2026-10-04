import { backendRequest } from "./backend-client";
import { serverBackendRequest } from "./backend-server";

export async function universalRequest<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (typeof window !== "undefined") {
    return backendRequest<T>(path, init);
  }
  return serverBackendRequest<T>(path, init);
}

export function unwrapData<T>(input: any): T {
  if (input && typeof input === "object" && "data" in input) {
    return input.data as T;
  }
  return input as T;
}

export const createUniversalGet = <T = any>(path: string) => {
  return async () => universalRequest<T>(path);
};

export const createUniversalPost = <TInput = any, TOutput = any>(
  path: string,
  fallback?: (data: TInput) => string,
) => {
  return async (input?: TInput): Promise<TOutput> => {
    const payload = unwrapData<TInput>(input);
    const targetPath = fallback && payload ? fallback(payload) : path;
    const reqInit: RequestInit = { method: "POST" };
    if (payload !== undefined) {
      reqInit.body = JSON.stringify(payload);
    }
    return universalRequest<TOutput>(targetPath, reqInit);
  };
};
