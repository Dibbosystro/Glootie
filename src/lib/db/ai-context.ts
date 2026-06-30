import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adCampaigns, adMetricsDaily, clients, productMetricsDaily, products } from "@/lib/db/schema";
import { currency, percent, roas } from "@/lib/format";

export type StoredProductAiContext = {
  title: string;
  contextText: string;
};

export async function getStoredProductAiContext(clientName: string, appProductId: string): Promise<StoredProductAiContext | null> {
  const db = getDb();
  if (!db) return null;

  const shopifyId = appProductId.startsWith("shopify-") ? appProductId.replace("shopify-", "") : appProductId;
  const [client] = await db.select({ id: clients.id, currency: clients.currency }).from(clients).where(eq(clients.name, clientName)).limit(1);
  if (!client) return null;

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.clientId, client.id), eq(products.shopifyId, shopifyId)))
    .limit(1);
  if (!product) return null;

  const [latestProductMetric] = await db
    .select()
    .from(productMetricsDaily)
    .where(and(eq(productMetricsDaily.clientId, client.id), eq(productMetricsDaily.productId, product.id)))
    .orderBy(desc(productMetricsDaily.date))
    .limit(1);

  const campaignRows = await db.select().from(adCampaigns).where(eq(adCampaigns.clientId, client.id)).orderBy(desc(adCampaigns.name)).limit(8);
  const campaignMetricRows = await db
    .select()
    .from(adMetricsDaily)
    .where(eq(adMetricsDaily.clientId, client.id))
    .orderBy(desc(adMetricsDaily.date))
    .limit(12);

  const campaignLines = campaignRows.slice(0, 5).map((campaign) => {
    const metric = campaignMetricRows.find((row) => row.campaignId === campaign.id);
    const spend = Number(metric?.spend ?? 0);
    const revenue = Number(metric?.revenue ?? 0);
    return `- ${campaign.name} (${campaign.source}, ${campaign.delivery}): ${currency(spend, client.currency)} spend, ${currency(revenue, client.currency)} revenue, ${roas(revenue / Math.max(spend, 1))}`;
  });

  const revenue = Number(latestProductMetric?.revenue ?? 0);
  const unitsSold = latestProductMetric?.unitsSold ?? 0;
  const sessions = latestProductMetric?.sessions ?? 0;

  return {
    title: product.title,
    contextText: [
      "Stored client context from Glootie database:",
      `Product: ${product.title}`,
      `Shopify status: ${product.status}`,
      `Product type: ${product.productType || "Uncategorized"}`,
      `Price: ${currency(Number(product.price), client.currency)}`,
      `Inventory: ${product.inventoryQty} units`,
      `Latest product signal: ${currency(revenue, client.currency)} revenue, ${unitsSold} units sold, ${sessions} sessions, ${percent(unitsSold / Math.max(sessions, 1), 2)} order rate.`,
      campaignLines.length ? `Recent campaign context:\n${campaignLines.join("\n")}` : "Recent campaign context: no stored campaign rows yet.",
      "Use this context to avoid recommending products with no stock, inactive status, or weak recent sales."
    ].join("\n")
  };
}
