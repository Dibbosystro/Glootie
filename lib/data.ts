import "server-only";

import type { AdCampaign, DashboardData, IntegrationStatus, Kpi, Product, ProviderKeyStatus, Recommendation } from "@/lib/types";
import { seedCampaigns, seedClient, seedIntegrations, seedProducts, seedRecommendations, seedSyncRuns } from "@/lib/seed";
import { currency, percent, roas } from "@/lib/format";
import { getServerEnv } from "@/lib/server-env";

export async function getDashboardData(): Promise<DashboardData> {
  // The data layer is intentionally centralized so seed mode can be replaced by
  // Drizzle queries without changing page components.
  const integrations = withRuntimeConnectionStatus(seedIntegrations);
  return {
    client: seedClient,
    generatedAt: new Date().toISOString(),
    integrations,
    products: seedProducts,
    campaigns: seedCampaigns,
    recommendations: seedRecommendations,
    syncRuns: seedSyncRuns
  };
}

function withRuntimeConnectionStatus(integrations: IntegrationStatus[]): IntegrationStatus[] {
  const hasShopify = Boolean(getServerEnv("SHOPIFY_STORE_DOMAIN") && getServerEnv("SHOPIFY_ADMIN_ACCESS_TOKEN"));
  const hasMeta = Boolean(getServerEnv("META_ACCESS_TOKEN") && getServerEnv("META_AD_ACCOUNT_ID"));
  const hasGoogle = Boolean(
    getServerEnv("GOOGLE_ADS_DEVELOPER_TOKEN") &&
      getServerEnv("GOOGLE_ADS_CLIENT_ID") &&
      getServerEnv("GOOGLE_ADS_CLIENT_SECRET") &&
      getServerEnv("GOOGLE_ADS_REFRESH_TOKEN") &&
      getServerEnv("GOOGLE_ADS_CUSTOMER_ID")
  );
  return integrations.map((integration) => {
    if (integration.type === "shopify" && hasShopify) {
      return { ...integration, status: "connected", message: "Configured for live Shopify Admin API sync." };
    }
    if (integration.type === "meta" && hasMeta) {
      return { ...integration, status: "connected", message: "Configured for live Meta Marketing API sync." };
    }
    if (integration.type === "google_ads" && hasGoogle) {
      return { ...integration, status: "connected", message: "Configured for live Google Ads API sync." };
    }
    if (integration.type === "openai" && getServerEnv("OPENAI_API_KEY")) {
      return { ...integration, status: "connected", message: "Configured for AI generation." };
    }
    if (integration.type === "neokens" && getServerEnv("NEOKENS_KEY")) {
      return { ...integration, status: "connected", message: "Configured for Neokens AI generation." };
    }
    return integration;
  });
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
