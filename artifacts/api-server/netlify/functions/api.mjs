let backendPromise;

function loadBackend() {
  process.env.NETLIFY = "true";
  process.env.NODE_ENV = process.env.CONTEXT === "dev" ? "development" : "production";
  backendPromise ??= import("../../../../.migration-backup/backend/src/server.ts");
  return backendPromise;
}

export async function handler(event, context) {
  const [{ default: serverless }, backend] = await Promise.all([
    import("serverless-http"),
    loadBackend(),
  ]);
  await backend.initializeBackend();
  return serverless(backend.app)(event, context);
}
