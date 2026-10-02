import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceDir = path.join(workspaceRoot, ".migration-backup", ".output", "public");
const outputDir = path.join(workspaceRoot, ".output", "public");

const entryPoint = path.join(sourceDir, "index.html");
try {
  const entryStat = await stat(entryPoint);
  if (!entryStat.isFile()) {
    throw new Error(`${entryPoint} is not a file`);
  }
} catch (error) {
  throw new Error(
    `Valoriza frontend build did not produce ${entryPoint}`,
    { cause: error },
  );
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.dirname(outputDir), { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

console.info(`Copied Valoriza static site to ${outputDir}`);