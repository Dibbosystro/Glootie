import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { listOpenWaiting } from "@/lib/integrations/chatway";

export const runtime = "nodejs";
export const maxDuration = 10;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// Open Chatway conversations where the customer spoke last (closers filtered).
// Scans the most recent `pages` (10 convs each) so it fits the 10s budget.
export async function GET(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const pages = clamp(Number(searchParams.get("pages")) || 3, 1, 8);
  const includeClosers = searchParams.get("includeClosers") === "1";

  try {
    const conversations = await listOpenWaiting({ pages, includeClosers });
    return NextResponse.json({ conversations, scannedPages: pages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chatway list failed." },
      { status: 502 }
    );
  }
}
