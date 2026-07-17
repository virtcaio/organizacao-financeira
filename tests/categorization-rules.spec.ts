import { test, expect } from "@playwright/test";

const ts = Date.now();
const TEST_USER = {
  name: "Rules E2E",
  email: `rules-e2e-${ts}@test.local`,
  password: "Test1234!Strong",
};

test.describe.configure({ mode: "serial" });

test("CRUD de regras de categorização em /configuracoes", async ({ page }) => {
  // Cadastro
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(TEST_USER.name);
  await page.getByLabel("E-mail").fill(TEST_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_USER.password);
  await page.getByLabel("Confirmar senha").fill(TEST_USER.password);
  await page.getByRole("button", { name: /^Criar conta$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // /configuracoes — section "Regras de categorização" com EmptyState
  await page.goto("/configuracoes");
  await expect(
    page.locator('[data-slot="card-title"]').getByText("Regras de categorização", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Nenhuma regra ainda")).toBeVisible();

  // 1. Criar regra "uber" → Transporte / Aplicativos
  await page
    .locator('[data-slot="card-title"]:has-text("Regras de categorização")')
    .locator("..")
    .locator("..")
    .getByRole("button", { name: /^Nova regra$/i })
    .click();
  await expect(page.getByRole("heading", { name: "Nova regra" })).toBeVisible();
  await page.getByLabel("Padrão").fill("uber");

  // Abre Select categoria; pega a primeira opção dentro do grupo Despesa
  await page.locator("#categoryId").click();
  // Aplicativos (Uber/99) é seed; vamos só pegar Restaurantes pra teste robusto
  await page.getByRole("option", { name: /Aplicativos/i }).first().click();

  await page.getByRole("button", { name: /^Criar regra$/i }).click();
  await expect(page.getByText("Regra criada")).toBeVisible({ timeout: 5000 });

  // Regra aparece na tabela
  await expect(page.locator('[data-rule-pattern="uber"]')).toBeVisible();

  // 2. Editar regra: muda prioridade
  await page
    .locator('[data-rule-pattern="uber"]')
    .getByRole("button", { name: "Ações" })
    .click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar regra" })).toBeVisible();
  const priorityInput = page.getByLabel("Prioridade");
  await priorityInput.fill("50");
  await page.getByRole("button", { name: /^Salvar$/i }).click();
  await expect(page.getByText("Regra atualizada")).toBeVisible({ timeout: 5000 });

  // 3. Excluir regra
  await page
    .locator('[data-rule-pattern="uber"]')
    .getByRole("button", { name: "Ações" })
    .click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await expect(page.getByText(/Excluir regra "uber"/i)).toBeVisible();
  await page.getByRole("button", { name: /^Excluir$/i }).click();
  await expect(page.getByText("Regra excluída")).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-rule-pattern="uber"]')).not.toBeVisible();
  await expect(page.getByText("Nenhuma regra ainda")).toBeVisible();
});
