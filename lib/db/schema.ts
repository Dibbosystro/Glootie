import { boolean, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  storeUrl: text("store_url").notNull(),
  currency: text("currency").notNull().default("AUD"),
  timezone: text("timezone").notNull().default("Australia/Brisbane"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("missing"),
    externalAccountId: text("external_account_id"),
    externalAccountName: text("external_account_name"),
    encryptedCredentials: jsonb("encrypted_credentials"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("integrations_client_type_uq").on(t.clientId, t.type)]
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  rowsChanged: integer("rows_changed").notNull().default(0),
  message: text("message").notNull().default("")
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    shopifyId: text("shopify_id").notNull(),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    vendor: text("vendor"),
    productType: text("product_type").notNull().default("Uncategorized"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
    imageUrl: text("image_url"),
    inventoryQty: integer("inventory_qty").notNull().default(0),
    status: text("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("products_client_shopify_uq").on(t.clientId, t.shopifyId)]
);

export const productMetricsDaily = pgTable(
  "product_metrics_daily",
  {
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    unitsSold: integer("units_sold").notNull().default(0),
    revenue: numeric("revenue", { precision: 10, scale: 2 }).notNull().default("0"),
    sessions: integer("sessions").notNull().default(0),
    addToCart: integer("add_to_cart").notNull().default(0),
    checkouts: integer("checkouts").notNull().default(0)
  },
  (t) => [primaryKey({ columns: [t.clientId, t.productId, t.date] })]
);

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    objective: text("objective"),
    delivery: text("delivery").notNull().default("inactive"),
    dailyBudget: numeric("daily_budget", { precision: 10, scale: 2 }).notNull().default("0"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" })
  },
  (t) => [uniqueIndex("ad_campaigns_client_src_ext_uq").on(t.clientId, t.source, t.externalId)]
);

export const adSets = pgTable("ad_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("inactive")
});

export const ads = pgTable("ads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
  adSetId: uuid("ad_set_id").references(() => adSets.id, { onDelete: "set null" }),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("inactive"),
  creativeUrl: text("creative_url")
});

export const adMetricsDaily = pgTable(
  "ad_metrics_daily",
  {
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
    adSetId: uuid("ad_set_id").references(() => adSets.id, { onDelete: "set null" }),
    adId: uuid("ad_id").references(() => ads.id, { onDelete: "set null" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    date: text("date").notNull(),
    spend: numeric("spend", { precision: 10, scale: 2 }).notNull().default("0"),
    impressions: integer("impressions").notNull().default(0),
    reach: integer("reach").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    purchases: integer("purchases").notNull().default(0),
    revenue: numeric("revenue", { precision: 10, scale: 2 }).notNull().default("0"),
    frequency: numeric("frequency", { precision: 6, scale: 2 }).notNull().default("0"),
    cpm: numeric("cpm", { precision: 10, scale: 2 }).notNull().default("0"),
    ctr: numeric("ctr", { precision: 8, scale: 6 }).notNull().default("0")
  },
  (t) => [primaryKey({ columns: [t.clientId, t.source, t.campaignId, t.date] })]
);

export const productRecommendations = pgTable("product_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  state: text("state").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  headline: text("headline").notNull(),
  reason: text("reason").notNull(),
  nextAction: text("next_action").notNull(),
  rawSignals: jsonb("raw_signals").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const aiProviders = pgTable("ai_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("missing"),
  encryptedApiKey: text("encrypted_api_key"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const adCopyGenerations = pgTable("ad_copy_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  prompt: text("prompt").notNull(),
  output: text("output").notNull(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const imageGenerations = pgTable("image_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("prompt_ready"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
