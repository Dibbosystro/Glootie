import type { AdCampaign, Client, IntegrationStatus, Product, Recommendation, SyncRun } from "@/lib/types";

const now = new Date("2026-05-14T08:00:00.000Z").toISOString();

export const seedClient: Client = {
  id: "crg",
  name: "Cafe Racer Garage",
  storeUrl: "https://caferacergarageshop.com",
  currency: "AUD",
  timezone: "Australia/Brisbane"
};

export const seedProducts: Product[] = [
  {
    id: "control-hub-x3",
    shopifyId: "shopify-1001",
    title: "X3 Control Hub",
    handle: "x3-control-hub",
    vendor: "Prime Moto",
    productType: "Electrics",
    price: 319,
    cost: 126,
    imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80",
    inventoryQty: 41,
    status: "active",
    unitsSold30d: 9,
    revenue30d: 2871,
    sessions30d: 1160,
    conversionRate: 0.0078
  },
  {
    id: "led-headlight",
    shopifyId: "shopify-1002",
    title: "LED Headlight LP1",
    handle: "led-headlight-lp1",
    vendor: "Prime Moto",
    productType: "Lighting",
    price: 149,
    cost: 61,
    imageUrl: "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?auto=format&fit=crop&w=900&q=80",
    inventoryQty: 36,
    status: "active",
    unitsSold30d: 11,
    revenue30d: 1639,
    sessions30d: 790,
    conversionRate: 0.0139
  },
  {
    id: "key-ignition",
    shopifyId: "shopify-1003",
    title: "Key Ignition Switch",
    handle: "key-ignition-switch",
    vendor: "Prime Moto",
    productType: "Electrics",
    price: 79,
    cost: 26,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80",
    inventoryQty: 72,
    status: "active",
    unitsSold30d: 18,
    revenue30d: 1422,
    sessions30d: 890,
    conversionRate: 0.0202
  },
  {
    id: "tc3-module",
    shopifyId: "shopify-1004",
    title: "TC3 Control Module",
    handle: "tc3-control-module",
    vendor: "Prime Moto",
    productType: "Electrics",
    price: 289,
    cost: 133,
    imageUrl: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=900&q=80",
    inventoryQty: 0,
    status: "active",
    unitsSold30d: 5,
    revenue30d: 1445,
    sessions30d: 720,
    conversionRate: 0.0069
  },
  {
    id: "seat-bundle",
    shopifyId: "shopify-1005",
    title: "Cafe Racer Seat Bundle",
    handle: "cafe-racer-seat-bundle",
    vendor: "Cafe Racer Garage",
    productType: "Seats",
    price: 249,
    cost: 151,
    imageUrl: "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=900&q=80",
    inventoryQty: 18,
    status: "active",
    unitsSold30d: 3,
    revenue30d: 747,
    sessions30d: 940,
    conversionRate: 0.0032
  },
  {
    id: "reg-rec",
    shopifyId: "shopify-1006",
    title: "Regulator Rectifier",
    handle: "regulator-rectifier",
    vendor: "Prime Moto",
    productType: "Electrics",
    price: 119,
    cost: 43,
    imageUrl: "https://images.unsplash.com/photo-1603714228681-b399854b8f80?auto=format&fit=crop&w=900&q=80",
    inventoryQty: 52,
    status: "active",
    unitsSold30d: 13,
    revenue30d: 1547,
    sessions30d: 610,
    conversionRate: 0.0213
  }
];

export const seedCampaigns: AdCampaign[] = [
  {
    id: "meta-crg-sales",
    source: "meta",
    externalId: "120244614859610042",
    name: "CRG - Sales",
    delivery: "inactive",
    objective: "Sales",
    dailyBudget: 70,
    spend30d: 1565.06,
    revenue30d: 4608.87,
    purchases30d: 14,
    impressions30d: 182256,
    reach30d: 64368,
    clicks30d: 2410,
    frequency: 2.83,
    cpm: 8.59,
    ctr: 0.0132,
    productId: null,
    campaignCategory: "bundle_offer",
    campaignCategoryLabel: "Bundle campaign",
    campaignCategoryDetail: "Core electrics, control modules, lighting, and seat offer traffic."
  },
  {
    id: "meta-seat-carousel",
    source: "meta",
    externalId: "120244614859610099",
    name: "Seat Bundle Carousel",
    delivery: "paused",
    objective: "Sales",
    dailyBudget: 18,
    spend30d: 186.42,
    revenue30d: 212,
    purchases30d: 1,
    impressions30d: 20810,
    reach30d: 11021,
    clicks30d: 171,
    frequency: 1.89,
    cpm: 8.96,
    ctr: 0.0082,
    productId: "seat-bundle",
    campaignCategory: "product_specific",
    campaignCategoryLabel: "Seat bundle product campaign",
    campaignCategoryDetail: "Single-product carousel focused on the Cafe Racer Seat Bundle offer."
  },
  {
    id: "google-brand-search",
    source: "google_ads",
    externalId: "google-001",
    name: "Brand Search - Cafe Racer Garage",
    delivery: "limited",
    objective: "Search",
    dailyBudget: 20,
    spend30d: 312.8,
    revenue30d: 1119.2,
    purchases30d: 6,
    impressions30d: 9300,
    reach30d: 0,
    clicks30d: 418,
    frequency: 0,
    cpm: 33.63,
    ctr: 0.0449,
    productId: null,
    campaignCategory: "brand_search",
    campaignCategoryLabel: "Brand search",
    campaignCategoryDetail: "Brand and high-intent Google Search traffic."
  }
];

export const seedIntegrations: IntegrationStatus[] = [
  {
    type: "shopify",
    label: "Shopify",
    status: "demo",
    lastSyncedAt: now,
    message: "Seed mode. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN for live product sync."
  },
  {
    type: "meta",
    label: "Meta Ads",
    status: "demo",
    lastSyncedAt: now,
    message: "Seed mode. Add META_ACCESS_TOKEN and META_AD_ACCOUNT_ID for live campaign sync."
  },
  {
    type: "google_ads",
    label: "Google Ads",
    status: "demo",
    lastSyncedAt: null,
    message: "Google Ads scaffolding is ready. Add OAuth and customer env vars to sync live metrics."
  },
  {
    type: "openai",
    label: "OpenAI",
    status: "missing",
    lastSyncedAt: null,
    message: "Optional for ad copy and image prompt generation."
  },
  {
    type: "neokens",
    label: "Neokens",
    status: "missing",
    lastSyncedAt: null,
    message: "Optional Anthropic-compatible gateway for ad copy generation. Uses NEOKENS_KEY."
  }
];

export const seedSyncRuns: SyncRun[] = [
  {
    id: "sync-demo-all",
    source: "all",
    status: "demo",
    startedAt: now,
    finishedAt: now,
    rowsChanged: 0,
    message: "Demo data loaded. Live sync will run when credentials are configured."
  }
];

export const seedRecommendations: Recommendation[] = [
  {
    id: "rec-scale-x3",
    productId: "control-hub-x3",
    state: "scale",
    score: 91,
    headline: "Scale the X3 Control Hub",
    reason: "It has enough stock and strong revenue, but the profitable Meta activity should be read as a bundle campaign, not a single-product ad.",
    nextAction: "Keep it eligible for bundle creative and test one dedicated product angle separately.",
    signals: ["Bundle campaign signal", "41 units in stock", "A$2,871 product revenue"]
  },
  {
    id: "rec-test-reg-rec",
    productId: "reg-rec",
    state: "test",
    score: 84,
    headline: "Test Regulator Rectifier ads",
    reason: "High conversion rate, healthy margin, and enough inventory make it a good next product to validate.",
    nextAction: "Create one product demo image ad and one builder-problem copy angle.",
    signals: ["2.13% product CVR", "52 units in stock", "64% estimated margin"]
  },
  {
    id: "rec-fix-tc3",
    productId: "tc3-module",
    state: "do_not_advertise",
    score: 12,
    headline: "Do not advertise TC3 right now",
    reason: "It has purchase history but zero inventory. Sending paid traffic here wastes demand.",
    nextAction: "Restock or remove from ad consideration until inventory returns.",
    signals: ["0 units in stock", "A$1,445 demand signal", "Active product status"]
  },
  {
    id: "rec-hold-seat",
    productId: "seat-bundle",
    state: "hold",
    score: 38,
    headline: "Hold the Seat Bundle",
    reason: "The product has stock, but the campaign barely breaks even and the product conversion rate is weak.",
    nextAction: "Improve product page and creative before adding spend.",
    signals: ["1.14x ad ROAS", "0.32% CVR", "18 units in stock"]
  }
];
