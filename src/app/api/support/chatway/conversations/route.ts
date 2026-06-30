import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { listOpenWaiting, listConversations } from "@/lib/integrations/chatway";

export const runtime = "nodejs";
// Scans several conversation pages + parallel last-message fetches; ask for 60s
// (Fluid Compute extends Hobby; clamps harmlessly otherwise).
export const maxDuration = 60;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// scope=all  -> every conversation (open + resolved), one page (10) at a time,
//               with pagination for load-more. The full Chatway inbox.
// scope=waiting (default) -> smart triage: open convs where the customer spoke
//               last (closers filtered), enriched.
export async function GET(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "all" ? "all" : "waiting";

  try {
    if (scope === "all") {
      const page = clamp(Number(searchParams.get("page")) || 1, 1, 200);
      const result = await listConversations(page);
      return NextResponse.json({ scope, ...result });
    }
    const pages = clamp(Number(searchParams.get("pages")) || 3, 1, 8);
    const includeClosers = searchParams.get("includeClosers") === "1";
    const conversations = await listOpenWaiting({ pages, includeClosers });
    return NextResponse.json({ scope, conversations, scannedPages: pages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chatway list failed." },
      { status: 502 }
    );
  }
}
