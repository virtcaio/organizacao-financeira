import { defineConfig, devices } from "@playwright/test";

// Pode ser sobrescrito por env var:
//   PLAYWRIGHT_BASE_URL=https://organizacao-financeira-p7vt.vercel.app pnpm exec playwright test
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
