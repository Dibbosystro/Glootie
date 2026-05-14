import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { generateAdCopy } from "@/lib/integrations/ai";
import type { AiProviderId } from "@/lib/types";

export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { productId?: string; angle?: string; provider?: AiProviderId };
  const result = await generateAdCopy(body.productId ?? "", body.angle ?? "problem-solution", body.provider ?? "auto");
  return NextResponse.json(result);
}
