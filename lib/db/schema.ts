import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  boolean,
  date,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  pgEnum,
  char,
  varchar,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

// =============================================================================
// Enums
// =============================================================================

export const financialAccountType = pgEnum("financial_account_type", [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "broker",
]);

export const categoryKind = pgEnum("category_kind", [
  "income",
  "expense",
  "investment",
  "transfer",
]);

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "investment",
  "adjustment",
]);

export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "photo",
  "csv",
  "pdf",
  "ofx",
  "recurring",
]);

export const recurringFrequency = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const assetClass = pgEnum("asset_class", [
  "stock_br",
  "fii",
  "stock_intl",
  "crypto",
  "fixed_income",
]);

export const alertKind = pgEnum("alert_kind", [
  "budget_warning",
  "budget_exceeded",
  "bill_due",
  "invoice_closed",
  "goal_reached",
  "anomaly",
]);

export const aiRunKind = pgEnum("ai_run_kind", [
  "categorize_csv",
  "categorize_pdf",
  "ocr_receipt",
  "insight",
  "projection",
]);

// =============================================================================
// Auth.js tables (next-auth + @auth/drizzle-adapter)
// =============================================================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  // Local provider (email + password) — only set when user registered with credentials
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// =============================================================================
// Domain tables
// =============================================================================

export const financialAccounts = pgTable(
  "financial_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: financialAccountType("type").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("BRL"),
    openingBalance: numeric("opening_balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("financial_account_user_idx").on(t.userId)],
);

// Hierarchical (parent_id self-reference). Some categories are system-seeded (is_system = true).
export const categories = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null = system seed shared by all
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull(),
    icon: text("icon"),
    color: text("color"),
    isSystem: boolean("is_system").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [
    index("category_user_idx").on(t.userId),
    index("category_parent_idx").on(t.parentId),
  ],
);

export const transactions = pgTable(
  "transaction",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    financialAccountId: uuid("financial_account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("BRL"),
    date: date("date").notNull(),
    description: text("description").notNull(),
    notes: text("notes"),
    source: transactionSource("source").notNull().default("manual"),
    sourceRef: text("source_ref"), // storage key for photo/CSV/PDF
    // Installments
    installmentGroupId: uuid("installment_group_id"),
    installmentSeq: integer("installment_seq"),
    installmentTotal: integer("installment_total"),
    // Recurring origin
    recurringRuleId: uuid("recurring_rule_id"),
    // Transfer pair (the matching leg in the other account)
    transferPairId: uuid("transfer_pair_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tx_user_date_idx").on(t.userId, t.date),
    index("tx_user_account_idx").on(t.userId, t.financialAccountId),
    index("tx_user_category_idx").on(t.userId, t.categoryId),
    index("tx_installment_group_idx").on(t.installmentGroupId),
  ],
);

export const tags = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tag_user_name_uq").on(t.userId, t.name)],
);

export const transactionTags = pgTable(
  "transaction_tag",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.transactionId, t.tagId] })],
);

export const recurringRules = pgTable(
  "recurring_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    financialAccountId: uuid("financial_account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("BRL"),
    description: text("description").notNull(),
    frequency: recurringFrequency("frequency").notNull(),
    interval: integer("interval").notNull().default(1), // every N units
    dayOfMonth: integer("day_of_month"), // for monthly/yearly
    dayOfWeek: integer("day_of_week"), // 0-6 for weekly
    nextRunAt: date("next_run_at").notNull(),
    endDate: date("end_date"),
    paused: boolean("paused").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recurring_user_next_idx").on(t.userId, t.nextRunAt)],
);

export const categorizationRules = pgTable(
  "categorization_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pattern: text("pattern").notNull(), // matched against transaction description / merchant
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(100),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("catrule_user_priority_idx").on(t.userId, t.priority)],
);

// Override mensal: limite específico de um mês. Tem prioridade sobre o template.
export const budgets = pgTable(
  "budget",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: date("month").notNull(), // first day of the month
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("budget_user_cat_month_uq").on(t.userId, t.categoryId, t.month)],
);

// Orçamento padrão recorrente: vale pra todo mês, salvo override em `budget`.
export const budgetTemplates = pgTable(
  "budget_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("budget_template_user_cat_uq").on(t.userId, t.categoryId)],
);

export const goals = pgTable(
  "goal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
    currentAmount: numeric("current_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    currency: char("currency", { length: 3 }).notNull().default("BRL"),
    deadline: date("deadline"),
    targetAccountId: uuid("target_account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    achieved: boolean("achieved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goal_user_idx").on(t.userId)],
);

export const creditCards = pgTable("credit_card", {
  id: uuid("id").primaryKey().defaultRandom(),
  financialAccountId: uuid("financial_account_id")
    .notNull()
    .unique()
    .references(() => financialAccounts.id, { onDelete: "cascade" }),
  closingDay: integer("closing_day").notNull(), // 1-31
  dueDay: integer("due_day").notNull(), // 1-31
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }),
});

export const holdings = pgTable(
  "holding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    financialAccountId: uuid("financial_account_id").references(
      () => financialAccounts.id,
      { onDelete: "set null" },
    ),
    ticker: varchar("ticker", { length: 32 }).notNull(),
    assetClass: assetClass("asset_class").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
    avgPrice: numeric("avg_price", { precision: 14, scale: 4 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("BRL"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("holding_user_idx").on(t.userId),
    uniqueIndex("holding_user_ticker_uq").on(t.userId, t.ticker, t.currency),
  ],
);

export const quotes = pgTable(
  "quote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 32 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quote_ticker_fetched_idx").on(t.ticker, t.fetchedAt)],
);

export const alerts = pgTable(
  "alert",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: alertKind("kind").notNull(),
    payload: jsonb("payload").notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("alert_user_unread_idx").on(t.userId, t.readAt)],
);

// Audit + dedup cache for AI calls. Stores only the structured output (no prompt).
export const aiRuns = pgTable(
  "ai_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: aiRunKind("kind").notNull(),
    inputHash: varchar("input_hash", { length: 64 }).notNull(), // sha256 hex
    output: jsonb("output").notNull(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ai_run_user_hash_uq").on(t.userId, t.kind, t.inputHash),
  ],
);
