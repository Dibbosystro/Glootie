import { NextResponse } from "next/server";
import { requireSyncAccess } from "@/lib/auth";
import { syncMetaAds } from "@/lib/integrations/meta";

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const result = await syncMetaAds();
  return NextResponse.json(result);
}
