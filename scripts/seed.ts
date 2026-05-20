import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import postgres from "postgres";
import { categories } from "../lib/db/schema";

type Kind = "income" | "expense" | "investment" | "transfer";

type Group = {
  name: string;
  kind: Kind;
  icon?: string;
  children: { name: string; icon?: string }[];
};

const GROUPS: Group[] = [
  {
    name: "Receitas",
    kind: "income",
    icon: "💰",
    children: [
      { name: "Salário / Pró-labore" },
      { name: "Renda variável" },
      { name: "Rendimentos de investimentos" },
      { name: "Reembolsos" },
      { name: "Outras receitas" },
    ],
  },
  {
    name: "Moradia",
    kind: "expense",
    icon: "🏠",
    children: [
      { name: "Aluguel / Financiamento" },
      { name: "Condomínio" },
      { name: "IPTU" },
      { name: "Energia" },
      { name: "Água" },
      { name: "Gás" },
      { name: "Internet / TV" },
      { name: "Manutenção" },
    ],
  },
  {
    name: "Alimentação",
    kind: "expense",
    icon: "🍽️",
    children: [
      { name: "Supermercado" },
      { name: "Restaurantes" },
      { name: "Delivery" },
      { name: "Padaria / Café" },
    ],
  },
  {
    name: "Transporte",
    kind: "expense",
    icon: "🚗",
    children: [
      { name: "Combustível" },
      { name: "Aplicativos (Uber/99)" },
      { name: "Transporte público" },
      { name: "Manutenção do veículo" },
      { name: "IPVA / Seguro / Licenciamento" },
      { name: "Estacionamento / Pedágio" },
    ],
  },
  {
    name: "Saúde",
    kind: "expense",
    icon: "🏥",
    children: [
      { name: "Plano de saúde" },
      { name: "Consultas" },
      { name: "Farmácia" },
      { name: "Exames" },
      { name: "Terapia" },
      { name: "Academia" },
    ],
  },
  {
    name: "Educação",
    kind: "expense",
    icon: "📚",
    children: [
      { name: "Escola / Faculdade" },
      { name: "Cursos" },
      { name: "Livros" },
      { name: "Material" },
    ],
  },
  {
    name: "Família",
    kind: "expense",
    icon: "👨‍👩‍👧",
    children: [
      { name: "Filhos" },
      { name: "Pets" },
      { name: "Doméstica / Diarista" },
      { name: "Presentes" },
    ],
  },
  {
    name: "Pessoal",
    kind: "expense",
    icon: "🧴",
    children: [
      { name: "Vestuário" },
      { name: "Beleza" },
      { name: "Assinaturas digitais" },
    ],
  },
  {
    name: "Lazer",
    kind: "expense",
    icon: "🎉",
    children: [
      { name: "Viagens" },
      { name: "Cinema / Eventos" },
      { name: "Bares / Festas" },
      { name: "Hobbies" },
    ],
  },
  {
    name: "Financeiro",
    kind: "expense",
    icon: "🏦",
    children: [
      { name: "Tarifas bancárias" },
      { name: "Juros / Multas" },
      { name: "Impostos" },
      { name: "Doações" },
    ],
  },
  {
    name: "Investimentos",
    kind: "investment",
    icon: "📈",
    children: [
      { name: "Renda fixa" },
      { name: "Renda variável (BR)" },
      { name: "Internacional" },
      { name: "Cripto" },
      { name: "Previdência" },
    ],
  },
  {
    name: "Transferências",
    kind: "transfer",
    icon: "🔄",
    children: [],
  },
];

async function seed() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set");

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  let inserted = 0;
  let skipped = 0;

  for (const group of GROUPS) {
    // Find or insert parent
    const existingParent = await db
      .select()
      .from(categories)
      .where(
        and(
          isNull(categories.userId),
          isNull(categories.parentId),
          eq(categories.name, group.name),
        ),
      );

    let parentId: string;
    if (existingParent[0]) {
      parentId = existingParent[0].id;
      skipped++;
    } else {
      const [row] = await db
        .insert(categories)
        .values({
          name: group.name,
          kind: group.kind,
          icon: group.icon,
          isSystem: true,
          userId: null,
          parentId: null,
        })
        .returning({ id: categories.id });
      parentId = row.id;
      inserted++;
    }

    for (const child of group.children) {
      const existingChild = await db
        .select()
        .from(categories)
        .where(
          and(
            isNull(categories.userId),
            eq(categories.parentId, parentId),
            eq(categories.name, child.name),
          ),
        );

      if (existingChild[0]) {
        skipped++;
        continue;
      }

      await db.insert(categories).values({
        name: child.name,
        kind: group.kind,
        icon: child.icon,
        isSystem: true,
        userId: null,
        parentId,
      });
      inserted++;
    }
  }

  console.log(`Seed concluído. Inseridas: ${inserted}, já existentes: ${skipped}.`);
  await client.end();
}

seed().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
