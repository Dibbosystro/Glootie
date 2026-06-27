import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { getThread } from "@/lib/integrations/chatway";

export const runtime = "nodejs";
export const maxDuration = 10;

// Full thread for one conversation (oldest -> newest).
export async function GET(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const conversationId = (searchParams.get("conversationId") ?? "").trim();
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
  }

  try {
    const messages = await getThread(conversationId);
    return NextResponse.json({ conversationId, messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chatway thread fetch failed." },
      { status: 502 }
    );
  }
}
