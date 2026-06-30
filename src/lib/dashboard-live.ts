import "server-only";

import { unstable_cache as nextCache } from "next/cache";
import type {
  DashboardData, Campaign, Product, KPIMetrics, DailyMetric, SyncStatus,
  IntegrationConfig, CampaignCategory, Verdict, DeliveryStatus, CampaignSource,
} from "@/lib/types";
import type { AdCampaign, Product as BackendProduct } from "@/lib/backend-types";
import { getServerEnv } from "@/lib/server-env";
import { fetchShopifyProducts } from "@/lib/integrations/shopify";
import { fetchMetaCampaigns, fetchMetaDailyMetrics } from "@/lib/integrations/meta";
import { inferCampaignCategory } from "@/lib/campaign-category";

// ===== Connection detection (env-based, mirrors what each integration reads) =====
// A section only shows data when it is actually connected; otherwise it returns
// empty so the UI shows a clean "not connected" state instead of dummy numbers.
function detectConnections() {
  const shopifyDomain = getServerEnv("SHOPIFY_STORE_DOMAIN") || getServerEnv("SHOPIFY_CRG_STORE");
  const shopifyToken = getServerEnv("SHOPIFY_ADMIN_ACCESS_TOKEN") || getServerEnv("SHOPIFY_CRG_TOKEN");
  return {
    shopify: Boolean(shopifyDomain && shopifyToken),
    meta: Boolean(getServerEnv("META_ACCESS_TOKEN") && getServerEnv("META_AD_ACCOUNT_ID")),
    // Live Google Ads campaign sync is not built yet, so even when OAuth creds
    // exist we surface Google as not connected (empty state + Connect prompt)
    // rather than an empty page that claims to be connected. Flip on when a real
    // Google fetch is added.
    google: false,
    ai: Boolean(getServerEnv("NEOKENS_KEY") || getServerEnv("OPENAI_API_KEY") || getServerEnv("ANTHROPIC_API_KEY")),
  };
}

const num = (n: number) => (Number.isFinite(n) ? n : 0);
const round = (n: number, d = 2) => {
  const f = 10 ** d;
  return Math.round(num(n) * f) / f;
};

function emptyKpi(): KPIMetrics {
  return { revenue: 0, spend: 0, roas: 0, purchases: 0, clicks: 0, impressions: 0, ctr: 0, cpm: 0, frequency: 0, reach: 0 };
}

function kpiOf(campaigns: Campaign[]): KPIMetrics {
  const spend = campaigns.reduce((s, c) => s + num(c.metrics.spend), 0);
  const revenue = campaigns.reduce((s, c) => s + num(c.metrics.revenue), 0);
  const purchases = campaigns.reduce((s, c) => s + num(c.metrics.purchases), 0);
  const clicks = campaigns.reduce((s, c) => s + num(c.metrics.clicks), 0);
  const impressions = campaigns.reduce((s, c) => s + num(c.metrics.impressions), 0);
  const reach = campaigns.reduce((s, c) => s + num(c.metrics.reach), 0);
  return {
    revenue: round(revenue),
    spend: round(spend),
    roas: spend > 0 ? round(revenue / spend) : 0,
    purchases,
    clicks,
    impressions,
    ctr: impressions > 0 ? round((clicks / impressions) * 100, 2) : 0,
    cpm: impressions > 0 ? round((spend / impressions) * 1000, 2) : 0,
    frequency: reach > 0 ? round(impressions / reach, 2) : 0,
    reach,
  };
}

function toZCampaign(c: AdCampaign): Campaign {
  const spend = num(c.spend30d);
  const revenue = num(c.revenue30d);
  const clicks = num(c.clicks30d);
  const impressions = num(c.impressions30d);
  const reach = num(c.reach30d);
  const metrics: KPIMetrics = {
    revenue: round(revenue),
    spend: round(spend),
    roas: spend > 0 ? round(revenue / spend) : 0,
    purchases: num(c.purchases30d),
    clicks,
    impressions,
    ctr: impressions > 0 ? round((clicks / impressions) * 100, 2) : 0,
    cpm: impressions > 0 ? round((spend / impressions) * 1000, 2) : 0,
    frequency: reach > 0 ? round(impressions / reach, 2) : num(c.frequency),
    reach,
  };
  return {
    id: c.id,
    name: c.name,
    source: (c.source === "google_ads" ? "google" : "meta") as CampaignSource,
    delivery: c.delivery as DeliveryStatus,
    objective: c.objective,
    category: inferCampaignCategory(c) as CampaignCategory,
    dailyBudget: num(c.dailyBudget),
    metrics,
    createdAt: new Date().toISOString(),
  };
}

function verdictFor(p: BackendProduct): Verdict {
  if (p.status !== "active" || p.inventoryQty <= 0) return "do_not_advertise";
  if (p.inventoryQty < 5) return "hold";
  if (p.revenue30d >= 500) return "scale";
  if (p.revenue30d > 0) return "test";
  return "fix_first";
}

const verdictCopy: Record<Verdict, { headline: string; nextAction: string }> = {
  scale: { headline: "Advertise this", nextAction: "Build a focused product or bundle ad and scale with controlled spend." },
  test: { headline: "Test next", nextAction: "Run a small validation campaign before scaling." },
  hold: { headline: "Hold", nextAction: "Confirm restock before adding paid spend." },
  fix_first: { headline: "Fix first", nextAction: "Improve the page, offer, or proof before launch." },
  do_not_advertise: { headline: "Do not advertise", nextAction: "Fix status or stock before paid traffic." },
};

function reasonFor(p: BackendProduct, verdict: Verdict): string {
  if (p.status !== "active") return "Not active in Shopify yet. Fix the product status before sending ad traffic.";
  if (p.inventoryQty <= 0) return "Zero inventory. Do not send paid traffic until stock is back.";
  if (p.inventoryQty < 5) return "Inventory is low, hold paid traffic unless replenishment is confirmed.";
  if (verdict === "scale") return "Recent Shopify sales with healthy stock. Strong candidate to scale.";
  if (verdict === "test") return "Some recent sales and enough stock. Validate with a controlled test.";
  return "Stock on hand but no recent sales signal. Check page quality, margin, and offer first.";
}

function scoreFor(p: BackendProduct): number {
  const stock = Math.min(p.inventoryQty / 20, 1) * 35;
  const revenue = Math.min(p.revenue30d / 1000, 1) * 45;
  const sales = Math.min(p.unitsSold30d / 10, 1) * 20;
  const inactivePenalty = p.status !== "active" || p.inventoryQty <= 0 ? 100 : 0;
  return Math.round(Math.max(0, Math.min(100, stock + revenue + sales - inactivePenalty)));
}

function toZProduct(p: BackendProduct): Product {
  const verdict = verdictFor(p);
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    vendor: p.vendor,
    productType: p.productType,
    price: num(p.price),
    cost: num(p.cost),
    imageUrl: p.imageUrl,
    inventoryQty: p.inventoryQty,
    status: p.status,
    verdict,
    score: scoreFor(p),
    headline: verdictCopy[verdict].headline,
    reason: reasonFor(p, verdict),
    nextAction: verdictCopy[verdict].nextAction,
    sessions30d: num(p.sessions30d),
    sales30d: num(p.unitsSold30d),
    revenue30d: round(p.revenue30d),
    conversionRate: num(p.conversionRate),
  };
}

function buildIntegrations(conn: ReturnType<typeof detectConnections>): IntegrationConfig[] {
  const flag = (configured: boolean, connectedStatus: string) => ({
    configured,
    status: configured ? connectedStatus : "needs_setup",
  });
  return [
    { id: "shopify", name: "Shopify", type: "shopify", ...flag(conn.shopify, "connected"), description: "Product catalog, price, status, and inventory sync." },
    { id: "meta", name: "Meta Ads", type: "meta", ...flag(conn.meta, "connected"), description: "Campaign performance and insights." },
    { id: "google-ads", name: "Google Ads", type: "google-ads", ...flag(conn.google, "connected"), description: "Google Ads campaign data and insights." },
    { id: "ai", name: "Neokens AI", type: "ai", provider: "neokens", ...flag(conn.ai, "active"), description: "Ad copy generation and support replies." },
  ];
}

async function buildLiveDashboard(): Promise<DashboardData> {
  const conn = detectConnections();

  const [shopifyRes, metaRes, dailyRes] = await Promise.allSettled([
    conn.shopify ? fetchShopifyProducts() : Promise.resolve(null),
    conn.meta ? fetchMetaCampaigns() : Promise.resolve([] as AdCampaign[]),
    conn.meta ? fetchMetaDailyMetrics() : Promise.resolve([] as DailyMetric[]),
  ]);

  const backendProducts = shopifyRes.status === "fulfilled" && shopifyRes.value ? shopifyRes.value.products : [];
  const backendMeta = metaRes.status === "fulfilled" ? metaRes.value : [];
  const dailyMetrics: DailyMetric[] = dailyRes.status === "fulfilled" ? (dailyRes.value as DailyMetric[]) : [];

  // Capture fetch errors so a connected-but-failing integration shows an error
  // state instead of a misleading "Connected" with empty data.
  const reason = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" ? String((r.reason as Error)?.message ?? r.reason).slice(0, 300) : undefined;
  const shopifyError = reason(shopifyRes);
  const metaError = reason(metaRes) ?? reason(dailyRes);

  const products = backendProducts.map(toZProduct);
  const metaCampaigns = backendMeta.map(toZCampaign);
  const campaigns = [...metaCampaigns]; // Google omitted until connected.

  const metaKpi = kpiOf(metaCampaigns);
  const googleKpi = emptyKpi();
  const kpi = kpiOf(campaigns);

  const now = new Date().toISOString();
  const shopifyStatus = !conn.shopify ? "not_connected" : shopifyError ? "error" : "connected";
  const metaStatus = !conn.meta ? "not_connected" : metaError ? "error" : "connected";
  const syncStatus: SyncStatus = {
    shopify: { lastSync: conn.shopify && !shopifyError ? now : null, status: shopifyStatus },
    meta: { lastSync: conn.meta && !metaError ? now : null, status: metaStatus },
    googleAds: { lastSync: null, status: conn.google ? "connected" : "not_connected" },
  };

  const integrations = buildIntegrations(conn).map((i) => {
    if (i.type === "meta" && metaError) return { ...i, status: "error" };
    if (i.type === "shopify" && shopifyError) return { ...i, status: "error" };
    return i;
  });

  return {
    kpi,
    campaigns,
    products,
    dailyMetrics,
    syncStatus,
    metaKpi,
    googleKpi,
    activities: [],
    integrations,
    conversations: [],
    // Non-typed diagnostic channel: surfaces the real fetch error so a connected
    // integration that returns empty can be told apart from a true failure.
    _diagnostics: { meta: metaError ?? null, shopify: shopifyError ?? null },
  } as DashboardData;
}

// Cache the heavy live fetch for 2 minutes so navigating between pages (the shell
// + each page both read /api/dashboard) does not re-hit Shopify and Meta every time.
const cachedLiveDashboard = nextCache(buildLiveDashboard, ["glootie:live-dashboard:v1"], {
  revalidate: 120,
  tags: ["dashboard"],
});

export async function getLiveDashboardData(): Promise<DashboardData> {
  return cachedLiveDashboard();
}
