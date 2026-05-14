import "server-only";

export interface MetaSyncResult {
  source: "meta";
  status: "success" | "demo" | "error";
  rowsChanged: number;
  message: string;
}

export async function syncMetaAds(): Promise<MetaSyncResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!token || !adAccountId) {
    return {
      source: "meta",
      status: "demo",
      rowsChanged: 0,
      message: "Meta credentials are missing, seed ads data is being used."
    };
  }

  const acct = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v19.0/${acct}/campaigns`);
  url.searchParams.set("fields", "id,name,status,objective,daily_budget");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", token);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return {
      source: "meta",
      status: "error",
      rowsChanged: 0,
      message: `Meta sync failed: ${res.status} ${await res.text()}`
    };
  }
  const json = (await res.json()) as { data?: unknown[] };
  return {
    source: "meta",
    status: "success",
    rowsChanged: json.data?.length ?? 0,
    message: `Fetched ${json.data?.length ?? 0} Meta campaigns. Insights persistence is ready through Drizzle schema.`
  };
}
