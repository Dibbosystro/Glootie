export type AdsSource = "meta" | "google_ads";

export type CampaignCategory =
  | "bundle_offer"
  | "product_specific"
  | "brand_search"
  | "generic_search"
  | "shopping_catalog"
  | "performance_max"
  | "retargeting"
  | "prospecting"
  | "account_wide";

export type AiProviderId = "auto" | "openai" | "anthropic" | "gemini" | "openrouter" | "neokens";

export type RecommendationState =
  | "scale"
  | "test"
  | "hold"
  | "fix_first"
  | "do_not_advertise";

export interface Client {
  id: string;
  name: string;
  storeUrl: string;
  currency: string;
  timezone: string;
}

export interface IntegrationStatus {
  type: "shopify" | "meta" | "google_ads" | "openai" | "anthropic" | "gemini" | "openrouter" | "neokens";
  label: string;
  status: "connected" | "demo" | "missing" | "error";
  lastSyncedAt: string | null;
  message: string;
}

export interface Product {
  id: string;
  shopifyId: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  price: number;
  cost: number;
  imageUrl: string;
  inventoryQty: number;
  status: "active" | "draft" | "archived";
  unitsSold30d: number;
  revenue30d: number;
  sessions30d: number;
  conversionRate: number;
}

export interface AdCampaign {
  id: string;
  source: AdsSource;
  externalId: string;
  name: string;
  delivery: "active" | "paused" | "inactive" | "learning" | "limited";
  objective: string;
  dailyBudget: number;
  spend30d: number;
  revenue30d: number;
  purchases30d: number;
  impressions30d: number;
  reach30d: number;
  clicks30d: number;
  frequency: number;
  cpm: number;
  ctr: number;
  productId: string | null;
  campaignCategory?: CampaignCategory;
  campaignCategoryLabel?: string;
  campaignCategoryDetail?: string;
}

export interface Recommendation {
  id: string;
  productId: string;
  state: RecommendationState;
  score: number;
  headline: string;
  reason: string;
  nextAction: string;
  signals: string[];
}

export interface SyncRun {
  id: string;
  source: "shopify" | "meta" | "google_ads" | "all";
  status: "success" | "error" | "demo";
  startedAt: string;
  finishedAt: string;
  rowsChanged: number;
  message: string;
}

export interface DashboardData {
  client: Client;
  generatedAt: string;
  integrations: IntegrationStatus[];
  products: Product[];
  campaigns: AdCampaign[];
  recommendations: Recommendation[];
  syncRuns: SyncRun[];
}

export interface Kpi {
  label: string;
  value: string;
  helper: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

export interface ProviderKeyStatus {
  provider: Exclude<AiProviderId, "auto">;
  label: string;
  configured: boolean;
  envVar: string;
}
