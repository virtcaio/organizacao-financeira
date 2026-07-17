import { defineConfig, devices } from "@playwright/test";

// Pode ser sobrescrito por env var:
//   PLAYWRIGHT_BASE_URL=https://organizacao-financeira-p7vt.vercel.app pnpm exec playwright test
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  fullyParallel: false,
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Sobe o app sozinho (build + start em produção na 3005). Localmente, se já
  // houver servidor na porta, reusa (reuseExistingServer) e pula o build.
  // AUTH_TRUST_HOST é necessário pro Auth.js confiar em localhost fora do dev.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm exec next start -p 3005",
        url: "http://localhost:3005/login",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { AUTH_TRUST_HOST: "true" },
      },
});
