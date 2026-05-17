import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSyncAccess } from "@/lib/auth";
import { DASHBOARD_CACHE_TAG } from "@/lib/data";
import { syncGoogleAds } from "@/lib/integrations/google-ads";
import { syncMetaAds } from "@/lib/integrations/meta";
import { syncShopify } from "@/lib/integrations/shopify";
import { recordActivity } from "@/lib/support/activity";

export async function GET() {
  return POST();
}

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;

  const activity = await recordActivity({ type: "sync_all", summary: "Sync all sources" });
  const [shopify, meta, googleAds] = await Promise.all([syncShopify(), syncMetaAds(), syncGoogleAds()]);
  revalidateTag(DASHBOARD_CACHE_TAG);
  const rowsChanged = shopify.rowsChanged + meta.rowsChanged + googleAds.rowsChanged;
  const anyError = [shopify, meta, googleAds].some((item) => item.status === "error");
  const overallStatus = anyError ? "error" : [shopify, meta, googleAds].some((item) => item.status === "success") ? "success" : "demo";

  await activity.finish({
    status: anyError ? "error" : "success",
    summary: `Sync all: ${rowsChanged} rows fetched (shopify=${shopify.status}, meta=${meta.status}, google=${googleAds.status})`,
    detail: { shopify, meta, googleAds, rowsChanged },
    errorMessage: anyError
      ? [shopify, meta, googleAds].filter((s) => s.status === "error").map((s) => s.message).join(" | ")
      : undefined
  });

  return NextResponse.json({
    source: "all",
    status: overallStatus,
    rowsChanged,
    message: `Sync checked Shopify, Meta, and Google Ads. ${rowsChanged} remote rows fetched.`,
    results: { shopify, meta, googleAds }
  });
}
