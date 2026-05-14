import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { buildImagePrompt } from "@/lib/integrations/ai";

export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { productId?: string; scene?: string };
  const prompt = buildImagePrompt(body.productId ?? "", body.scene ?? "garage-workbench");
  return NextResponse.json({ prompt });
}
