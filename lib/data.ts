import "server-only";

import type { AdCampaign, DashboardData, IntegrationStatus, Kpi, Product, ProviderKeyStatus, Recommendation } from "@/lib/types";
import { seedCampaigns, seedClient, seedIntegrations, seedProducts, seedRecommendations, seedSyncRuns } from "@/lib/seed";
import { currency, percent, roas } from "@/lib/format";
import { getServerEnv } from "@/lib/server-env";
import { isCredentialKeyConfigured } from "@/lib/db/credentials";
import { fetchShopifyProducts } from "@/lib/integrations/shopify";
import { fetchMetaCampaigns } from "@/lib/integrations/meta";

export async function getDashboardData(): Promise<DashboardData> {
  const [shopifyResult, metaResult] = await Promise.allSettled([fetchShopifyProducts(), fetchMetaCampaigns()]);
  const liveProducts = shopifyResult.status === "fulfilled" ? shopifyResult.value.products : [];
  const liveShopifyInsights = shopifyResult.status === "fulfilled" ? shopifyResult.value.insights : undefined;
  const liveMetaCampaigns = metaResult.status === "fulfilled" ? metaResult.value : [];
  const products = liveProducts.length > 0 ? liveProducts : seedProducts;
  const campaigns = [
    ...(liveMetaCampaigns.length > 0 ? liveMetaCampaigns : seedCampaigns.filter((campaign) => campaign.source === "meta"))
  ];
  const recommendations = liveProducts.length > 0 ? buildProductRecommendations(products, campaigns) : seedRecommendations;
  const integrations = (await withRuntimeConnectionStatus(seedIntegrations)).map((integration) => {
    if (integration.type === "shopify" && shopifyResult.status === "rejected") {
      return { ...integration, status: "error" as const, message: shopifyResult.reason instanceof Error ? shopifyResult.reason.message : "Shopify sync failed." };
    }
    if (integration.type === "meta" && metaResult.status === "rejected") {
      return { ...integration, status: "error" as const, message: metaResult.reason instanceof Error ? metaResult.reason.message : "Meta sync failed." };
    }
    return integration;
  });
  return {
    client: seedClient,
    generatedAt: new Date().toISOString(),
    integrations,
    products,
    campaigns,
    recommendations,
    syncRuns: seedSyncRuns,
    shopifyInsights: liveShopifyInsights ?? buildSeedShopifyInsights(products)
  };
}

async function withRuntimeConnectionStatus(integrations: IntegrationStatus[]): Promise<IntegrationStatus[]> {
  const [hasShopify, hasMeta, hasGoogle, hasOpenAi, hasNeokens] = await Promise.all([
    hasIntegrationKeys("shopify", ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN"]),
    hasIntegrationKeys("meta", ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"]),
    hasIntegrationKeys("google_ads", ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"]),
    hasIntegrationKeys("openai", ["OPENAI_API_KEY"]),
    hasIntegrationKeys("neokens", ["NEOKENS_KEY"])
  ]);

  return integrations.map((integration) => {
    if (integration.type === "shopify" && hasShopify) {
      return { ...integration, status: "connected", message: "Configured for live Shopify Admin API sync." };
    }
    if (integration.type === "meta" && hasMeta) {
      return { ...integration, status: "connected", message: "Configured for live Meta Marketing API sync." };
    }
    if (integration.type === "google_ads" && hasGoogle) {
      return { ...integration, status: "demo", message: "Google Ads credentials are present, but live campaign sync is not enabled yet." };
    }
    if (integration.type === "openai" && hasOpenAi) {
      return { ...integration, status: "connected", message: "Configured for AI generation." };
    }
    if (integration.type === "neokens" && hasNeokens) {
      return { ...integration, status: "connected", message: "Configured for Neokens AI generation." };
    }
    return integration;
  });
}

async function hasIntegrationKeys(integrationType: string, keys: string[]): Promise<boolean> {
  const configured = await Promise.all(keys.map((key) => isCredentialKeyConfigured(integrationType, key)));
  return configured.every(Boolean);
}

export function getOverviewKpis(data: DashboardData): Kpi[] {
  const spend = sumCampaigns(data.campaigns, "spend30d");
  const revenue = sumCampaigns(data.campaigns, "revenue30d");
  const purchases = sumCampaigns(data.campaigns, "purchases30d");
  const cpp = purchases > 0 ? spend / purchases : 0;
  return [
    {
      label: "Tracked Revenue",
      value: currency(revenue, data.client.currency),
      helper: "From Meta and Google attributed sales",
      tone: revenue > spend * 2 ? "good" : "neutral"
    },
    {
      label: "Ad Spend",
      value: currency(spend, data.client.currency),
      helper: "Last 30 days across paid channels",
      tone: "neutral"
    },
    {
      label: "Blended ROAS",
      value: roas(revenue / Math.max(spend, 1)),
      helper: "Revenue divided by ad spend",
      tone: revenue / Math.max(spend, 1) >= 2.5 ? "good" : "warn"
    },
    {
      label: "Cost per Purchase",
      value: currency(cpp, data.client.currency),
      helper: `${purchases} purchases tracked`,
      tone: cpp <= 140 ? "good" : "warn"
    }
  ];
}

export function getSourceKpis(data: DashboardData, source: "meta" | "google_ads"): Kpi[] {
  const campaigns = data.campaigns.filter((campaign) => campaign.source === source);
  const spend = sumCampaigns(campaigns, "spend30d");
  const revenue = sumCampaigns(campaigns, "revenue30d");
  const purchases = sumCampaigns(campaigns, "purchases30d");
  const impressions = sumCampaigns(campaigns, "impressions30d");
  const clicks = sumCampaigns(campaigns, "clicks30d");
  return [
    { label: "ROAS", value: roas(revenue / Math.max(spend, 1)), helper: `${currency(revenue)} revenue`, tone: revenue / Math.max(spend, 1) >= 2.5 ? "good" : "warn" },
    { label: "Amount Spent", value: currency(spend), helper: `${campaigns.length} campaigns`, tone: "neutral" },
    { label: "Purchases", value: purchases.toFixed(0), helper: `${currency(purchases > 0 ? spend / purchases : 0)} per purchase`, tone: purchases > 0 ? "good" : "warn" },
    { label: "CTR", value: percent(clicks / Math.max(impressions, 1), 2), helper: `${impressions.toLocaleString()} impressions`, tone: clicks / Math.max(impressions, 1) >= 0.01 ? "good" : "warn" }
  ];
}

export function getProductById(data: DashboardData, id: string): Product | undefined {
  return data.products.find((product) => product.id === id);
}

export function getProductCampaigns(data: DashboardData, productId: string): AdCampaign[] {
  return data.campaigns.filter((campaign) => campaign.productId === productId);
}

export function getRecommendationForProduct(data: DashboardData, productId: string): Recommendation | undefined {
  return data.recommendations.find((recommendation) => recommendation.productId === productId);
}

export function getProviderKeyStatuses(): ProviderKeyStatus[] {
  return [
    { provider: "neokens", label: "Neokens", configured: Boolean(getServerEnv("NEOKENS_KEY")), envVar: "NEOKENS_KEY" },
    { provider: "openai", label: "OpenAI", configured: Boolean(getServerEnv("OPENAI_API_KEY")), envVar: "OPENAI_API_KEY" },
    { provider: "anthropic", label: "Anthropic", configured: Boolean(getServerEnv("ANTHROPIC_API_KEY")), envVar: "ANTHROPIC_API_KEY" },
    { provider: "gemini", label: "Gemini", configured: Boolean(getServerEnv("GEMINI_API_KEY")), envVar: "GEMINI_API_KEY" },
    { provider: "openrouter", label: "OpenRouter", configured: Boolean(getServerEnv("OPENROUTER_API_KEY")), envVar: "OPENROUTER_API_KEY" }
  ];
}

function sumCampaigns(campaigns: AdCampaign[], field: keyof Pick<AdCampaign, "spend30d" | "revenue30d" | "purchases30d" | "impressions30d" | "reach30d" | "clicks30d">): number {
  return campaigns.reduce((sum, campaign) => sum + Number(campaign[field] ?? 0), 0);
}

function buildSeedShopifyInsights(products: Product[]) {
  const revenue30d = products.reduce((sum, product) => sum + product.revenue30d, 0);
  const unitsSold30d = products.reduce((sum, product) => sum + product.unitsSold30d, 0);
  const sessions30d = products.reduce((sum, product) => sum + product.sessions30d, 0);
  return {
    revenue30d,
    orders30d: unitsSold30d,
    unitsSold30d,
    sessions30d,
    conversionRate: sessions30d > 0 ? unitsSold30d / sessions30d : 0,
    activeProducts: products.filter((product) => product.status === "active").length,
    totalProducts: products.length,
    totalInventory: products.reduce((sum, product) => sum + product.inventoryQty, 0),
    outOfStockProducts: products.filter((product) => product.inventoryQty <= 0).length
  };
}

function buildProductRecommendations(products: Product[], campaigns: AdCampaign[]): Recommendation[] {
  const campaignNames = campaigns.map((campaign) => campaign.name.toLowerCase());
  return [...products]
    .sort((a, b) => recommendationScore(b, campaignNames) - recommendationScore(a, campaignNames))
    .map((product) => {
      const score = recommendationScore(product, campaignNames);
      const hasCampaignNameMatch = campaignNames.some((name) => product.title.toLowerCase().split(/\s+/).some((word) => word.length > 4 && name.includes(word)));
      const state =
        product.status !== "active" || product.inventoryQty <= 0
          ? "do_not_advertise"
          : product.inventoryQty < 5
          ? "hold"
          : product.revenue30d >= 500 && !hasCampaignNameMatch
          ? "scale"
          : product.revenue30d > 0
          ? "test"
          : "fix_first";

      const reason =
        product.status !== "active"
          ? "This product is not active in Shopify yet. Fix the product status before sending ad traffic."
          : product.inventoryQty <= 0
          ? "This product has zero inventory. Do not send paid traffic until stock is back."
          : product.inventoryQty < 5
          ? "Inventory is low, so hold paid traffic unless replenishment is confirmed."
          : product.revenue30d >= 500 && !hasCampaignNameMatch
          ? "This product has recent Shopify sales and enough stock, but no obvious matching campaign name. It is a good candidate to test next."
          : product.revenue30d > 0
          ? "This product has recent Shopify sales and enough inventory. Validate it with a controlled test before scaling."
          : "This product has stock but no recent Shopify sales signal. Check page quality, margin, and offer before advertising.";

      return {
        id: `rec-${product.id}`,
        productId: product.id,
        state,
        score,
        headline: recommendationHeadline(state),
        reason,
        nextAction: recommendationNextAction(state),
        signals: [
          `${product.inventoryQty} in stock`,
          `${currency(product.revenue30d)} Shopify revenue in 30 days`,
          `${product.unitsSold30d} units sold in 30 days`
        ]
      };
    });
}

function recommendationScore(product: Product, campaignNames: string[]) {
  const stockScore = Math.min(product.inventoryQty / 20, 1) * 35;
  const revenueScore = Math.min(product.revenue30d / 1000, 1) * 45;
  const salesScore = Math.min(product.unitsSold30d / 10, 1) * 20;
  const campaignPenalty = campaignNames.some((name) => name.includes(product.title.toLowerCase())) ? 8 : 0;
  const inactivePenalty = product.status !== "active" || product.inventoryQty <= 0 ? 100 : 0;
  return Number(Math.max(0, stockScore + revenueScore + salesScore - campaignPenalty - inactivePenalty).toFixed(2));
}

function recommendationHeadline(state: Recommendation["state"]) {
  if (state === "scale") return "Advertise this";
  if (state === "test") return "Test next";
  if (state === "hold") return "Hold";
  if (state === "do_not_advertise") return "Do not advertise";
  return "Fix first";
}

function recommendationNextAction(state: Recommendation["state"]) {
  if (state === "scale") return "Build a focused product ad or bundle angle and test it with controlled spend.";
  if (state === "test") return "Create a small validation campaign before scaling.";
  if (state === "hold") return "Confirm stock before adding spend.";
  if (state === "do_not_advertise") return "Fix availability before paid traffic.";
  return "Improve the product page, offer, or proof before launch.";
}
