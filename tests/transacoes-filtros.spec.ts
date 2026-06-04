import { test, expect } from "@playwright/test";

const ts = Date.now();
const TEST_USER = {
  name: "Filtros E2E",
  email: `filtros-e2e-${ts}@test.local`,
  password: "Test1234!Strong",
};

const ACCOUNT_NAME = `Carteira ${ts}`;

test.describe.configure({ mode: "serial" });

test("filtros: busca textual + chip de active filter", async ({ page }) => {
  // Cadastro
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(TEST_USER.name);
  await page.getByLabel("E-mail").fill(TEST_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_USER.password);
  await page.getByLabel("Confirmar senha").fill(TEST_USER.password);
  await page.getByRole("button", { name: /^Criar conta$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // Cria 1 conta via /contas
  await page.goto("/contas");
  await page.getByRole("button", { name: /Nova conta/i }).first().click();
  await expect(page.getByRole("heading", { name: "Nova conta" })).toBeVisible();
  await page.getByLabel("Nome").fill(ACCOUNT_NAME);
  await page.getByLabel("Saldo inicial").fill("100");
  await page.getByRole("button", { name: /^Criar conta$/i }).click();
  await expect(page.getByText(ACCOUNT_NAME).first()).toBeVisible({ timeout: 5000 });

  // Cria 2 transações com descrições distintas
  await page.goto("/transacoes");
  for (const desc of ["Uber Eats Mercado", "Salario Mensal"]) {
    await page.getByRole("button", { name: /Nova transação/i }).first().click();
    await page.getByLabel("Descrição").fill(desc);
    await page.getByLabel(/^Valor/).fill("50");
    await page.getByRole("button", { name: /^Criar transação$/i }).click();
    // Espera fechar o dialog
    await expect(page.getByRole("heading", { name: "Nova transação" })).not.toBeVisible({ timeout: 5000 });
  }

  // Confirma que ambas aparecem
  await expect(page.getByText("Uber Eats Mercado")).toBeVisible();
  await expect(page.getByText("Salario Mensal")).toBeVisible();

  // Filtra via URL ?q=uber → só 1 visível
  await page.goto("/transacoes?q=uber");
  await expect(page.getByText("Uber Eats Mercado")).toBeVisible();
  await expect(page.getByText("Salario Mensal")).not.toBeVisible();

  // Chip de filtro ativo aparece
  const chip = page.locator('[data-chip-key="q"]');
  await expect(chip).toBeVisible();
  await expect(chip).toContainText("uber");

  // Clica no chip pra limpar → ambas voltam
  await chip.click();
  await expect(page.getByText("Uber Eats Mercado")).toBeVisible();
  await expect(page.getByText("Salario Mensal")).toBeVisible();
  await expect(page.locator('[data-chip-key="q"]')).not.toBeVisible();

  // Busca textual via Input + debounce
  await page.getByLabel("Buscar").fill("salario");
  await expect(page.getByText("Salario Mensal")).toBeVisible({ timeout: 2000 });
  await expect(page.getByText("Uber Eats Mercado")).not.toBeVisible();

  // Botão "Limpar" volta tudo
  await page.getByRole("button", { name: /^Limpar$/i }).click();
  await expect(page.getByText("Uber Eats Mercado")).toBeVisible();
  await expect(page.getByText("Salario Mensal")).toBeVisible();
});
