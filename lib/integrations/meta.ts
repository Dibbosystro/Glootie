import "server-only";

import type { AdCampaign } from "@/lib/types";
import { getServerEnv } from "@/lib/server-env";

export interface MetaSyncResult {
  source: "meta";
  status: "success" | "demo" | "error";
  rowsChanged: number;
  message: string;
}

interface MetaCampaignRaw {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  configured_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaInsightRaw {
  campaign_id: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

export async function syncMetaAds(): Promise<MetaSyncResult> {
  const token = getServerEnv("META_ACCESS_TOKEN");
  const adAccountId = getServerEnv("META_AD_ACCOUNT_ID");
  if (!token || !adAccountId) {
    return {
      source: "meta",
      status: "demo",
      rowsChanged: 0,
      message: "Meta credentials are missing, seed ads data is being used."
    };
  }

  try {
    const campaigns = await fetchMetaCampaigns();
    return {
      source: "meta",
      status: "success",
      rowsChanged: campaigns.length,
      message: `Fetched ${campaigns.length} Meta campaigns with last 30 days insights.`
    };
  } catch (error) {
    return {
      source: "meta",
      status: "error",
      rowsChanged: 0,
      message: `Meta sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

export async function fetchMetaCampaigns(): Promise<AdCampaign[]> {
  const token = getServerEnv("META_ACCESS_TOKEN");
  const adAccountId = getServerEnv("META_AD_ACCOUNT_ID");
  if (!token || !adAccountId) return [];

  const acct = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const [campaignRows, insightRows] = await Promise.all([
    fetchMetaPages<MetaCampaignRaw>(buildMetaUrl(`/${acct}/campaigns`, token, {
      fields: "id,name,status,effective_status,configured_status,objective,daily_budget,lifetime_budget",
      limit: "500"
    })),
    fetchMetaPages<MetaInsightRaw>(buildMetaUrl(`/${acct}/insights`, token, {
      level: "campaign",
      date_preset: "last_30d",
      time_increment: "all_days",
      fields: "campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpm,frequency,actions,action_values",
      limit: "500"
    }))
  ]);

  const campaignsById = new Map(campaignRows.map((campaign) => [campaign.id, campaign]));
  const insightsById = new Map(insightRows.map((insight) => [insight.campaign_id, insight]));
  const ids = new Set([...campaignsById.keys(), ...insightsById.keys()]);

  return [...ids]
    .map((id) => mapMetaCampaign(id, campaignsById.get(id), insightsById.get(id)))
    .sort((a, b) => b.spend30d - a.spend30d);
}

async function fetchMetaPages<T>(firstUrl: string): Promise<T[]> {
  const rows: T[] = [];
  let url: string | null = firstUrl;

  while (url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data?: T[]; paging?: { next?: string } };
    rows.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }

  return rows;
}

function buildMetaUrl(path: string, token: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/v19.0${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", token);
  return url.toString();
}

function mapMetaCampaign(id: string, campaign?: MetaCampaignRaw, insight?: MetaInsightRaw): AdCampaign {
  const spend = Number(insight?.spend ?? 0);
  const impressions = Number(insight?.impressions ?? 0);
  const clicks = Number(insight?.clicks ?? 0);
  const purchases = getActionValue(insight?.actions, "purchase");
  const revenue = getActionValue(insight?.action_values, "purchase");

  return {
    id: `meta-${id}`,
    source: "meta",
    externalId: id,
    name: campaign?.name || insight?.campaign_name || id,
    delivery: normalizeMetaDelivery(campaign?.effective_status || campaign?.status || campaign?.configured_status),
    objective: campaign?.objective || "Campaign",
    dailyBudget: Number(campaign?.daily_budget ?? 0) / 100,
    spend30d: roundMoney(spend),
    revenue30d: roundMoney(revenue),
    purchases30d: purchases,
    impressions30d: impressions,
    reach30d: Number(insight?.reach ?? 0),
    clicks30d: clicks,
    frequency: Number(insight?.frequency ?? 0),
    cpm: Number(insight?.cpm ?? 0),
    ctr: Number(insight?.ctr ?? 0) / 100,
    productId: null
  };
}

function getActionValue(actions: MetaInsightRaw["actions"], match: "purchase") {
  if (!actions) return 0;
  if (match === "purchase") {
    const preferredTypes = [
      "offsite_conversion.fb_pixel_purchase",
      "purchase",
      "omni_purchase",
      "onsite_web_purchase"
    ];
    for (const type of preferredTypes) {
      const action = actions.find((item) => item.action_type === type);
      if (action) return Number(action.value || 0);
    }
  }
  return 0;
}

function normalizeMetaDelivery(status?: string): AdCampaign["delivery"] {
  const normalized = status?.toUpperCase();
  if (normalized === "ACTIVE") return "active";
  if (normalized === "PAUSED" || normalized === "CAMPAIGN_PAUSED" || normalized === "ADSET_PAUSED") return "paused";
  if (normalized === "IN_PROCESS" || normalized === "WITH_ISSUES" || normalized === "PENDING_REVIEW") return "limited";
  return "inactive";
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
