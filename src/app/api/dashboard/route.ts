import { NextResponse } from "next/server";
import { getLiveDashboardData } from "@/lib/dashboard-live";

export const runtime = "nodejs";
// Live Shopify + Meta fetches; ask for 60s (Fluid Compute extends Hobby, clamps
// harmlessly otherwise). Results are cached for 120s in getLiveDashboardData.
export const maxDuration = 60;

export async function GET() {
  try {
    const data = await getLiveDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dashboard failed to load." },
      { status: 500 }
    );
  }
}
