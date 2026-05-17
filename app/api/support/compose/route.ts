import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { composeReply } from "@/lib/support/agent";

export const runtime = "nodejs";
// Vercel Hobby plan caps server functions at 10s. Compose targets 3 tool rounds
// + a fast non-thinking model so it fits within budget.
export const maxDuration = 10;

export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  let body: { customerMessage?: string };
  try {
    body = (await request.json()) as { customerMessage?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const customerMessage = (body.customerMessage ?? "").trim();
  if (!customerMessage) {
    return NextResponse.json({ error: "customerMessage is required." }, { status: 400 });
  }
  if (customerMessage.length > 4000) {
    return NextResponse.json({ error: "customerMessage is too long (max 4000 chars)." }, { status: 400 });
  }

  const result = await composeReply(customerMessage);
  if (result.provider === "error") {
    return NextResponse.json({ error: result.errorMessage ?? "Compose failed." }, { status: 502 });
  }
  return NextResponse.json(result);
}
