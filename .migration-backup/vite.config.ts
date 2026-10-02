// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only; target is selected below), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { spawn } from "node:child_process";

let backendStarted = false;

export default defineConfig({
  nitro: {
    preset: "vercel",
  },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4000",
          changeOrigin: true,
        },
      },
    },
    plugins: [
      {
        name: "backend-runner",
        configureServer() {
          if (!backendStarted) {
            backendStarted = true;
            const proc = spawn("npx", ["tsx", "backend/src/server.ts"], {
              stdio: "inherit",
              env: { ...process.env, BACKEND_PORT: "4000" },
            });
            process.on("exit", () => {
              try {
                proc.kill();
              } catch (e) {
                void e;
              }
            });
          }
        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
