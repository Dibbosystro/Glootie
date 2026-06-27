import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { hasAccess } from "@/lib/auth";
import { getServerEnv } from "@/lib/server-env";
import { composeReply } from "@/lib/support/agent";

export const runtime = "nodejs";
// Vercel Hobby plan caps server functions at 10s. Compose targets 3 tool rounds
// + a fast non-thinking model so it fits within budget.
export const maxDuration = 10;

// Machine callers (ManyChat External Request, n8n) authenticate with the
// SUPPORT_API_KEY bearer; the in-app inbox uses the login cookie. Same key the
// KB bulk-upsert route already expects.
function checkApiKey(provided: string | null | undefined): boolean {
  const expected = getServerEnv("SUPPORT_API_KEY");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    const headerStore = await headers();
    const provided = headerStore.get("authorization")?.replace(/^Bearer\s+/i, "") ?? headerStore.get("x-support-api-key");
    if (!checkApiKey(provided)) {
      return NextResponse.json(
        { error: "Unauthorized. Use the app login, or Authorization: Bearer <SUPPORT_API_KEY>." },
        { status: 401 }
      );
    }
  }

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
