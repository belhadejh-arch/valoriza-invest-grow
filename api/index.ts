type URLSearchParamsApi = {
  get(name: string): string | null;
  delete(name: string): void;
  readonly size: number;
  toString(): string;
};

type URLApi = {
  searchParams: URLSearchParamsApi;
};

const urlRuntime = globalThis as unknown as {
  URL: new (input: string, base: string) => URLApi;
  URLSearchParams: new (init: URLSearchParamsApi) => URLSearchParamsApi;
};

// The backend build emits this runtime module using its own TypeScript config.
// @ts-expect-error the generated JavaScript intentionally has no declaration file.
import { app, initDatabase } from "../artifacts/api-server/dist/server.mjs";

let databaseInitialization: Promise<void> | undefined;

export default async function handler(request: any, response: any) {
  const incomingUrl = new urlRuntime.URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  const apiPath = incomingUrl.searchParams.get("__api_path");

  if (!apiPath) {
    response.status(404).json({ message: "NOT_FOUND" });
    return;
  }

  const query = new urlRuntime.URLSearchParams(incomingUrl.searchParams);
  query.delete("__api_path");
  request.url = `/api/${apiPath.replace(/^\/+/, "")}${query.size ? `?${query}` : ""}`;

  try {
    databaseInitialization ??= initDatabase();
    await databaseInitialization;
  } catch {
    // Do not leak database configuration or connection details to callers.
    databaseInitialization = undefined;
    response.status(503).json({ message: "SERVICE_UNAVAILABLE" });
    return;
  }

  app(request, response);
}