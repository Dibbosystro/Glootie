import { NextResponse } from "next/server";
import { requireSyncAccess } from "@/lib/auth";
import { syncGoogleAds } from "@/lib/integrations/google-ads";

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const result = await syncGoogleAds();
  return NextResponse.json(result);
}
