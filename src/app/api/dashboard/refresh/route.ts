import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAccess } from "@/lib/auth";

export const runtime = "nodejs";

// Busts the cached live dashboard so the next /api/dashboard read re-pulls
// Shopify + Meta. Used by the Sync buttons.
export async function POST() {
  const denied = await requireAccess();
  if (denied) return denied;
  revalidateTag("dashboard");
  return NextResponse.json({ ok: true });
}
