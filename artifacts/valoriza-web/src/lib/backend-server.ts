import { backendRequest } from "./backend-client";

// The migrated app is client-rendered, so data requests go through the
// Replit /api service route instead of TanStack Start server functions.
export const serverBackendRequest: <T = any>(
  path: string,
  init?: RequestInit,
) => Promise<T> = backendRequest;
