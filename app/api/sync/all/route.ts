import { NextResponse } from "next/server";
import { requireSyncAccess } from "@/lib/auth";
import { syncGoogleAds } from "@/lib/integrations/google-ads";
import { syncMetaAds } from "@/lib/integrations/meta";
import { syncShopify } from "@/lib/integrations/shopify";

export async function GET() {
  return POST();
}

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const [shopify, meta, googleAds] = await Promise.all([syncShopify(), syncMetaAds(), syncGoogleAds()]);
  const rowsChanged = shopify.rowsChanged + meta.rowsChanged + googleAds.rowsChanged;
  return NextResponse.json({
    source: "all",
    status: [shopify, meta, googleAds].some((item) => item.status === "error") ? "error" : [shopify, meta, googleAds].some((item) => item.status === "success") ? "success" : "demo",
    rowsChanged,
    message: `Sync checked Shopify, Meta, and Google Ads. ${rowsChanged} remote rows fetched.`,
    results: { shopify, meta, googleAds }
  });
}
