// Single Vite app at root — TanStack Router SPA (file-based routes).
// NOTE (lead 2026-10-06): tanstackStart()+nitro() hung the local build at
// transform stage. SSR upgrade defers to Lovable's in-product Modern upgrade;
// local stays SPA so typecheck/test/build stay green. Deps for Start remain
// installed (@tanstack/react-start, nitro) + src/server.ts stub for import day.
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
  server: { port: 8080, host: true },
  preview: { port: 8080 },
  build: { outDir: "dist" },
});
