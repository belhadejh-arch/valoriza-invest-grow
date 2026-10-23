import type { ClientBase } from "pg";

/**
 * Resolve the configured namespace once per pool and apply it before handing
 * out every new connection. Never guess "public" or move existing tables.
 */
export function createNamespaceInitializer() {
  let selectedPath: Promise<string> | undefined;
  return async (client: ClientBase): Promise<void> => {
    selectedPath ??= client.query<{ schemas: string[] }>(
      "SELECT current_schemas(false)::text[] AS schemas",
    ).then(({ rows }) => {
      if (!Array.isArray(rows[0]?.schemas) || !rows[0].schemas.length) {
        throw new Error("Database namespace is unavailable.");
      }
      return rows[0].schemas.map((name) => `"${name.replace(/"/g, '""')}"`).join(", ");
    }).catch((error) => {
      selectedPath = undefined;
      throw error;
    });
    const path = await selectedPath;
    await client.query("SELECT set_config('search_path', $1, false)", [path]);
  };
}
