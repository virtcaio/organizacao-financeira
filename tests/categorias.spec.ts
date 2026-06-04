import { test, expect } from "@playwright/test";

const ts = Date.now();
const TEST_USER = {
  name: "Categorias E2E",
  email: `cat-e2e-${ts}@test.local`,
  password: "Test1234!Strong",
};

test.describe.configure({ mode: "serial" });

test("CRUD de categorias custom + arquivar seeds", async ({ page }) => {
  // Cadastro
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(TEST_USER.name);
  await page.getByLabel("E-mail").fill(TEST_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(TEST_USER.password);
  await page.getByLabel("Confirmar senha").fill(TEST_USER.password);
  await page.getByRole("button", { name: /^Criar conta$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // /configuracoes
  await page.goto("/configuracoes");
  // CardTitle "Categorias" (renderiza como div com data-slot=card-title)
  await expect(
    page.locator('[data-slot="card-title"]').getByText("Categorias", { exact: true }),
  ).toBeVisible();

  // Seed "Alimentação" presente
  await expect(
    page.locator('[data-category-name="Alimentação"]').first(),
  ).toBeVisible();

  // 1. Criar categoria-mãe custom "Hobby Caro" (Despesa)
  await page.getByRole("button", { name: /^Nova$/i }).click();
  await expect(page.getByRole("heading", { name: "Nova categoria" })).toBeVisible();
  await page.getByRole("button", { name: /Categoria-mãe/i }).click();
  // Tipo já default "expense"; nome + ícone
  await page.getByLabel(/^Nome$/i).fill("Hobby Caro");
  await page.getByLabel(/^Ícone$/i).fill("🎸");
  await page.getByRole("button", { name: /^Criar categoria$/i }).click();
  await expect(page.getByText("Categoria criada")).toBeVisible({ timeout: 5000 });

  const hobbyRow = page.locator('[data-category-name="Hobby Caro"]');
  await expect(hobbyRow).toBeVisible();

  // 2. Criar subcategoria custom "Sushi de Domingo" sob "Alimentação"
  await page.getByRole("button", { name: /^Nova$/i }).click();
  await expect(page.getByRole("heading", { name: "Nova categoria" })).toBeVisible();
  await page.getByRole("button", { name: /Subcategoria/i }).click();
  // Open select de categoria-mãe
  await page.locator("#parentId").click();
  await page.getByRole("option", { name: /Alimentação/ }).first().click();
  await page.getByLabel(/^Nome$/i).fill("Sushi de Domingo");
  await page.getByLabel(/^Ícone$/i).fill("🍣");
  await page.getByRole("button", { name: /^Criar categoria$/i }).click();
  await expect(page.getByText("Categoria criada")).toBeVisible({ timeout: 5000 });

  const sushiRow = page.locator('[data-category-name="Sushi de Domingo"]');
  await expect(sushiRow).toBeVisible();

  // 3. Editar custom — muda ícone do Sushi
  await sushiRow.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar categoria" })).toBeVisible();
  await page.getByLabel(/^Ícone$/i).fill("🍱");
  await page.getByRole("button", { name: /^Salvar$/i }).click();
  await expect(page.getByText("Categoria atualizada")).toBeVisible({ timeout: 5000 });

  // 4. Bloqueio: arquivar mãe com subs ativas deve falhar
  const moradiaRow = page.locator('[data-category-name="Moradia"]').first();
  await moradiaRow.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(page.getByText(/subcategoria.*ativa.*Arquive/i)).toBeVisible({ timeout: 5000 });

  // 5. Arquivar uma seed leaf — "Delivery" (sub de Alimentação)
  const deliveryRow = page.locator('[data-category-name="Delivery"]').first();
  await deliveryRow.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(page.getByText("Categoria arquivada")).toBeVisible({ timeout: 5000 });
  await expect(deliveryRow.getByText("Arquivada")).toBeVisible();

  // 6. Restaurar seed
  await deliveryRow.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Restaurar" }).click();
  await expect(page.getByText("Categoria restaurada")).toBeVisible({ timeout: 5000 });
  await expect(deliveryRow.getByText("Arquivada")).not.toBeVisible();

  // 7. Hard-delete custom sem uso — Hobby Caro
  await hobbyRow.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: /Excluir permanentemente/i }).click();
  await expect(page.getByText(/Excluir.*Hobby Caro/i)).toBeVisible();
  await page.getByRole("button", { name: /^Excluir$/i }).click();
  await expect(page.getByText("Categoria excluída")).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-category-name="Hobby Caro"]')).not.toBeVisible();
});
