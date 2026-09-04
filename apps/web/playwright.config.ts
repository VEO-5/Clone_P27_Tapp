import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // Mock-backed but browser-real: 10s assertions stay stable on loaded machines.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build: Turbopack dev chunks race under E2E load
    // (ChunkLoadError flakes). Build once, serve stable — also closer to prod.
    command: "pnpm build && pnpm start --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 240_000,
    env: { NEXT_PUBLIC_API_MOCK: "true" },
  },
});
