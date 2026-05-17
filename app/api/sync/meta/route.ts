import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSyncAccess } from "@/lib/auth";
import { DASHBOARD_CACHE_TAG } from "@/lib/data";
import { syncMetaAds } from "@/lib/integrations/meta";
import { recordActivity } from "@/lib/support/activity";

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const activity = await recordActivity({ type: "sync_meta", summary: "Sync Meta Ads" });
  const result = await syncMetaAds();
  revalidateTag(DASHBOARD_CACHE_TAG);
  await activity.finish({
    status: result.status === "error" ? "error" : "success",
    summary: `${result.status}: ${result.rowsChanged} rows. ${result.message}`,
    detail: result,
    errorMessage: result.status === "error" ? result.message : undefined
  });
  return NextResponse.json(result);
}
