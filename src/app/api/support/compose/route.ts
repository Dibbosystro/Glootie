import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { hasAccess } from "@/lib/auth";
import { getServerEnv } from "@/lib/server-env";
import { composeReply } from "@/lib/support/agent";

export const runtime = "nodejs";
// Grounding is pre-fetched in composeReply so the common case is a single model
// round-trip. We still ask for 60s (Fluid Compute extends Hobby past the 10s
// default; it clamps harmlessly if not available) to absorb cold starts + a tool round.
export const maxDuration = 60;

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
