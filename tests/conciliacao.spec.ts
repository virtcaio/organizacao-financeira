import { test, expect } from "@playwright/test";

const ts = Date.now();
const TEST_USER = {
  name: "Conciliação E2E",
  email: `conc-e2e-${ts}@test.local`,
  password: "Test1234!Strong",
};

const ACCOUNT_NAME = `Carteira ${ts}`;

test.describe.configure({ mode: "serial" });

test("conciliação: saldo atual + dialog gera Ajuste", async ({ page }) => {
  // Cadastro
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(TEST_USER.name);
  await page.getByLabel("E-mail").fill(TEST_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_USER.password);
  await page.getByLabel("Confirmar senha").fill(TEST_USER.password);
  await page.getByRole("button", { name: /^Criar conta$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // Cria conta com saldo inicial 100
  await page.goto("/contas");
  await page.getByRole("button", { name: /Nova conta/i }).first().click();
  await expect(page.getByRole("heading", { name: "Nova conta" })).toBeVisible();
  await page.getByLabel("Nome").fill(ACCOUNT_NAME);
  await page.getByLabel("Saldo inicial").fill("100");
  await page.getByRole("button", { name: /^Criar conta$/i }).click();
  await expect(page.getByText(ACCOUNT_NAME).first()).toBeVisible({ timeout: 5000 });

  // Saldo atual = 100,00 (sem transações)
  await expect(page.getByText(/R\$\s*100,00/).first()).toBeVisible();

  // Cria uma receita de 50 → saldo atual deve virar 150
  await page.goto("/transacoes");
  await page.getByRole("button", { name: /Nova transação/i }).first().click();
  // Type defaults a "Despesa" — trocar para "Receita"
  await page.locator("#type").click();
  await page.getByRole("option", { name: /^Receita$/i }).click();
  await page.getByLabel("Descrição").fill("Recebimento teste");
  await page.getByLabel(/^Valor/).fill("50");
  await page.getByRole("button", { name: /^Criar transação$/i }).click();
  await expect(page.getByRole("heading", { name: "Nova transação" })).not.toBeVisible({ timeout: 5000 });

  // Volta a /contas e valida que o saldo atual é 150
  await page.goto("/contas");
  await expect(page.getByText(/R\$\s*150,00/).first()).toBeVisible();

  // Abre row actions → Conciliar saldo
  await page.getByRole("button", { name: "Ações" }).first().click();
  await page.getByRole("menuitem", { name: /Conciliar saldo/i }).click();
  await expect(page.getByRole("heading", { name: "Conciliar saldo" })).toBeVisible();

  // Dialog mostra "Saldo atual no app" = 150,00
  await expect(
    page.getByText(/Saldo atual no app/i),
  ).toBeVisible();

  // Digita 200 → diferença deve aparecer como +50
  await page.getByLabel(/Saldo real/i).fill("200");
  await expect(page.getByText(/\+\s*R\$\s*50,00/)).toBeVisible();

  // Confirma
  await page.getByRole("button", { name: /^Conciliar$/i }).click();
  await expect(page.getByText(/Saldo conciliado/i)).toBeVisible({ timeout: 5000 });

  // Saldo atual agora é 200,00
  await expect(page.getByText(/R\$\s*200,00/).first()).toBeVisible();

  // /transacoes deve listar uma linha "Ajuste"
  await page.goto("/transacoes");
  await expect(page.getByText("Ajuste de saldo")).toBeVisible();
});
