import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSyncAccess } from "@/lib/auth";
import { DASHBOARD_CACHE_TAG } from "@/lib/data";
import { syncGoogleAds } from "@/lib/integrations/google-ads";
import { recordActivity } from "@/lib/support/activity";

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const activity = await recordActivity({ type: "sync_google_ads", summary: "Sync Google Ads" });
  const result = await syncGoogleAds();
  revalidateTag(DASHBOARD_CACHE_TAG);
  await activity.finish({
    status: result.status === "error" ? "error" : "success",
    summary: `${result.status}: ${result.rowsChanged} rows. ${result.message}`,
    detail: result,
    errorMessage: result.status === "error" ? result.message : undefined
  });
  return NextResponse.json(result);
}
