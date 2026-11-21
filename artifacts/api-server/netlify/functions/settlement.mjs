let backendPromise;

function loadBackend() {
  process.env.NETLIFY = "true";
  process.env.NODE_ENV = process.env.CONTEXT === "dev" ? "development" : "production";
  backendPromise ??= import("../../../../.migration-backup/backend/src/server.ts");
  return backendPromise;
}

export default async function handler() {
  const backend = await loadBackend();
  await backend.initializeBackend();
  await backend.runScheduledSettlementJobs();
  return new Response("Settlement jobs completed.", { status: 200 });
}

export const config = {
  schedule: "* * * * *",
};
