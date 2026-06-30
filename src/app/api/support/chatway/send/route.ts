import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { createMessage, resolveConversation, type ChatwayAttachment } from "@/lib/integrations/chatway";
import { recordActivity } from "@/lib/support/activity";

export const runtime = "nodejs";
export const maxDuration = 10;

interface SendBody {
  conversationId?: string;
  content?: string;
  type?: "message" | "note";
  attachments?: ChatwayAttachment[];
  resolve?: boolean;
}

// Post a human-reviewed reply (or an agent-only note) back to a Chatway thread,
// optionally resolving it. The human always drives this from the inbox.
export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const conversationId = (body.conversationId ?? "").trim();
  const content = (body.content ?? "").trim();
  const type = body.type === "note" ? "note" : "message";
  const resolveOnly = !content && Boolean(body.resolve);
  if (!conversationId) return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
  // Allow a pure resolve (empty content + resolve:true) so the inbox "Mark
  // Resolved" button can close a thread without posting a message.
  if (!content && !resolveOnly) return NextResponse.json({ error: "content is required." }, { status: 400 });

  const activity = await recordActivity({
    type: "chatway_send",
    actor: "support-hire",
    summary: resolveOnly ? `resolve -> ${conversationId.slice(0, 8)}` : `${type} -> ${conversationId.slice(0, 8)}`,
    detail: { conversationId, type, resolve: Boolean(body.resolve) }
  });

  try {
    let id: string | null = null;
    if (!resolveOnly) {
      ({ id } = await createMessage({
        conversationId,
        content,
        type,
        attachments: body.attachments
      }));
    }
    if (body.resolve) await resolveConversation(conversationId);
    await activity.finish({
      status: "success",
      summary: resolveOnly
        ? `resolved ${conversationId.slice(0, 8)}`
        : `${type} sent to ${conversationId.slice(0, 8)}${body.resolve ? " (resolved)" : ""}`,
      detail: { conversationId, messageId: id, type, resolved: Boolean(body.resolve) }
    });
    return NextResponse.json({ ok: true, id, resolved: Boolean(body.resolve) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chatway send failed.";
    await activity.finish({ status: "error", summary: "Chatway send failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
