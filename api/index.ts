import { app, initDatabase } from "../.migration-backup/backend/src/server.js";

let databaseInitialization: Promise<void> | undefined;

export default async function handler(request: any, response: any) {
  const incomingUrl = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  const apiPath = incomingUrl.searchParams.get("__api_path");

  if (!apiPath) {
    response.status(404).json({ message: "NOT_FOUND" });
    return;
  }

  const query = new URLSearchParams(incomingUrl.searchParams);
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