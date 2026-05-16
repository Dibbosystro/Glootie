import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSyncAccess } from "@/lib/auth";
import { DASHBOARD_CACHE_TAG } from "@/lib/data";
import { syncGoogleAds } from "@/lib/integrations/google-ads";

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const result = await syncGoogleAds();
  revalidateTag(DASHBOARD_CACHE_TAG);
  return NextResponse.json(result);
}
