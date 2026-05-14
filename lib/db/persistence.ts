import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  adCampaigns,
  adMetricsDaily,
  clients,
  productMetricsDaily,
  products,
  syncRuns
} from "@/lib/db/schema";
import type { AdCampaign, Client, Product, SyncRun } from "@/lib/types";

type PersistResult = {
  persisted: boolean;
  rowsChanged: number;
};

export async function persistShopifySnapshot(client: Client, productRows: Product[]): Promise<PersistResult> {
  const db = getDb();
  if (!db) return { persisted: false, rowsChanged: 0 };

  const clientId = await upsertClient(client);
  const date = todayKey();
  let rowsChanged = 0;

  for (const product of productRows) {
    const [savedProduct] = await db
      .insert(products)
      .values({
        clientId,
        shopifyId: product.shopifyId,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        productType: product.productType || "Uncategorized",
        price: money(product.price),
        cost: money(product.cost),
        imageUrl: product.imageUrl,
        inventoryQty: product.inventoryQty,
        status: product.status,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [products.clientId, products.shopifyId],
        set: {
          title: product.title,
          handle: product.handle,
          vendor: product.vendor,
          productType: product.productType || "Uncategorized",
          price: money(product.price),
          cost: money(product.cost),
          imageUrl: product.imageUrl,
          inventoryQty: product.inventoryQty,
          status: product.status,
          updatedAt: new Date()
        }
      })
      .returning({ id: products.id });

    if (!savedProduct) continue;
    rowsChanged += 1;

    await db
      .insert(productMetricsDaily)
      .values({
        clientId,
        productId: savedProduct.id,
        date,
        unitsSold: product.unitsSold30d,
        revenue: money(product.revenue30d),
        sessions: product.sessions30d
      })
      .onConflictDoUpdate({
        target: [productMetricsDaily.clientId, productMetricsDaily.productId, productMetricsDaily.date],
        set: {
          unitsSold: product.unitsSold30d,
          revenue: money(product.revenue30d),
          sessions: product.sessions30d
        }
      });
  }

  return { persisted: true, rowsChanged };
}

export async function persistAdCampaignSnapshot(client: Client, campaignRows: AdCampaign[]): Promise<PersistResult> {
  const db = getDb();
  if (!db) return { persisted: false, rowsChanged: 0 };

  const clientId = await upsertClient(client);
  const date = todayKey();
  let rowsChanged = 0;

  for (const campaign of campaignRows) {
    const [savedCampaign] = await db
      .insert(adCampaigns)
      .values({
        clientId,
        source: campaign.source,
        externalId: campaign.externalId,
        name: campaign.name,
        objective: campaign.objective,
        delivery: campaign.delivery,
        dailyBudget: money(campaign.dailyBudget)
      })
      .onConflictDoUpdate({
        target: [adCampaigns.clientId, adCampaigns.source, adCampaigns.externalId],
        set: {
          name: campaign.name,
          objective: campaign.objective,
          delivery: campaign.delivery,
          dailyBudget: money(campaign.dailyBudget)
        }
      })
      .returning({ id: adCampaigns.id });

    if (!savedCampaign) continue;
    rowsChanged += 1;

    await db
      .insert(adMetricsDaily)
      .values({
        clientId,
        source: campaign.source,
        campaignId: savedCampaign.id,
        date,
        spend: money(campaign.spend30d),
        impressions: campaign.impressions30d,
        reach: campaign.reach30d,
        clicks: campaign.clicks30d,
        purchases: campaign.purchases30d,
        revenue: money(campaign.revenue30d),
        frequency: decimal(campaign.frequency),
        cpm: money(campaign.cpm),
        ctr: decimal(campaign.ctr)
      })
      .onConflictDoUpdate({
        target: [adMetricsDaily.clientId, adMetricsDaily.source, adMetricsDaily.campaignId, adMetricsDaily.date],
        set: {
          spend: money(campaign.spend30d),
          impressions: campaign.impressions30d,
          reach: campaign.reach30d,
          clicks: campaign.clicks30d,
          purchases: campaign.purchases30d,
          revenue: money(campaign.revenue30d),
          frequency: decimal(campaign.frequency),
          cpm: money(campaign.cpm),
          ctr: decimal(campaign.ctr)
        }
      });
  }

  return { persisted: true, rowsChanged };
}

export async function recordSyncRun(client: Client, run: Omit<SyncRun, "id" | "startedAt" | "finishedAt">): Promise<void> {
  const db = getDb();
  if (!db) return;

  const clientId = await upsertClient(client);
  const now = new Date();

  await db.insert(syncRuns).values({
    clientId,
    source: run.source,
    status: run.status,
    startedAt: now,
    finishedAt: now,
    rowsChanged: run.rowsChanged,
    message: run.message
  });
}

export async function upsertClient(client: Client): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured.");

  const existing = await db.select({ id: clients.id }).from(clients).where(eq(clients.name, client.name)).limit(1);
  if (existing[0]) return existing[0].id;

  const [savedClient] = await db
    .insert(clients)
    .values({
      name: client.name,
      storeUrl: client.storeUrl,
      currency: client.currency,
      timezone: client.timezone
    })
    .returning({ id: clients.id });

  if (!savedClient) throw new Error("Could not create client.");
  return savedClient.id;
}

export async function findStoredProduct(clientName: string, appProductId: string) {
  const db = getDb();
  if (!db) return null;

  const shopifyId = appProductId.startsWith("shopify-") ? appProductId.replace("shopify-", "") : appProductId;
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.name, clientName)).limit(1);
  if (!client) return null;

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.clientId, client.id), eq(products.shopifyId, shopifyId)))
    .limit(1);

  return product ?? null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function decimal(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6) : "0";
}
