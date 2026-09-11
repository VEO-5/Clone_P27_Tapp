// MIRROR vite.config — STOCK Vite + TanStack Router.
// REPLACE-ON-ARRIVAL: the real Lovable scaffold uses
// `@lovable.dev/vite-tanstack-config` + Nitro/Cloudflare + SSR entries
// (src/router.tsx, src/server.ts, routeTree.gen.ts). Do NOT copy this file
// into the Lovable repo. It exists only for fast local preview.
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: { port: 5173 },
  preview: { port: 5173 },
});
