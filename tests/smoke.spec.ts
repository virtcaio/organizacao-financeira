import { test, expect } from "@playwright/test";

const ts = Date.now();
const TEST_USER = {
  name: "E2E Tester",
  email: `e2e-${ts}@test.local`,
  password: "Test1234!Strong",
};

test.describe.configure({ mode: "serial" });

test("cadastro → dashboard → contas → importar guards", async ({ page, context }) => {
  // 1. Sign up
  await page.goto("/cadastro");
  await expect(page.locator('[data-slot="card-title"]').getByText("Criar conta")).toBeVisible();

  await page.getByLabel("Nome").fill(TEST_USER.name);
  await page.getByLabel("E-mail").fill(TEST_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_USER.password);
  await page.getByLabel("Confirmar senha").fill(TEST_USER.password);
  await page.getByRole("button", { name: /^Criar conta$/i }).click();

  // 2. Should land on dashboard with the empty-state onboarding
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByText(/Bem-vindo/i)).toBeVisible();
  await expect(page.getByText("Cadastre suas contas")).toBeVisible();

  // 3. /importar shows the "no account" guard (we have a user but no accounts/key)
  await page.goto("/importar");
  // The guard order is: no key first → then no account.
  // With a fresh user, both are missing — the "API key" guard fires first.
  await expect(page.getByText(/Configure sua chave/i)).toBeVisible();

  // 4. /configuracoes renders the BYOK form
  await page.goto("/configuracoes");
  await expect(page.getByText(/Anthropic API Key/i)).toBeVisible();
  await expect(page.getByLabel(/Sua chave/i)).toBeVisible();

  // 5. Submit an obviously invalid key → expect a toast error from /api/ai/validate-key
  await page.getByLabel(/Sua chave/i).fill("sk-ant-this-is-not-real-1234567890");
  await page.getByRole("button", { name: /Salvar e validar/i }).click();
  // Sonner toast container appears with the error
  await expect(page.getByText(/Chave inválida|invalid/i).first()).toBeVisible({
    timeout: 20_000,
  });

  // 6. Bulk endpoint refuses unauthenticated calls — sanity check via fetch with no session.
  const newContext = await context.browser()!.newContext();
  const newPage = await newContext.newPage();
  const r1 = await newPage.request.post("http://localhost:3005/api/transactions/bulk", {
    data: { rows: [] },
  });
  expect(r1.status()).toBe(401);
  const r2 = await newPage.request.post("http://localhost:3005/api/ai/validate-key", {
    headers: { "x-anthropic-key": "sk-ant-anything" },
  });
  expect(r2.status()).toBe(401);
  await newContext.close();
});
