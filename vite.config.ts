// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import http from "node:http";
import { spawn, type ChildProcess } from "node:child_process";

let backendProcess: ChildProcess | null = null;

function valorizaBackendPlugin(): Plugin {
  return {
    name: "valoriza-backend-runner",
    configureServer() {
      const checkAndStart = () => {
        const req = http.request("http://127.0.0.1:4000/api/auth/session", { timeout: 1000 }, () => {
          // Already running
        });
        req.on("error", () => {
          if (!backendProcess) {
            console.log("⚡ Starting Valoriza backend on port 4000...");
            backendProcess = spawn("npx", ["tsx", "backend/src/server.ts"], {
              env: {
                ...process.env,
                PORT: "4000",
              },
              stdio: "inherit",
              detached: false,
            });
            backendProcess.on("exit", () => {
              backendProcess = null;
            });
          }
        });
        req.end();
      };

      checkAndStart();
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4000",
          changeOrigin: true,
          secure: false,
        },
        "/auth": {
          target: "http://127.0.0.1:4000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [valorizaBackendPlugin()],
  },
});

