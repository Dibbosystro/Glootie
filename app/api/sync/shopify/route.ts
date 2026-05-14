import { NextResponse } from "next/server";
import { requireSyncAccess } from "@/lib/auth";
import { syncShopify } from "@/lib/integrations/shopify";

export async function POST() {
  const denied = await requireSyncAccess();
  if (denied) return denied;
  const result = await syncShopify();
  return NextResponse.json(result);
}
