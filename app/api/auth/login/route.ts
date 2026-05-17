import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { setAccessCookie } from "@/lib/auth";
import { recordActivity } from "@/lib/support/activity";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.APP_ACCESS_PASSWORD;
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "unknown";

  if (expected && body.password !== expected) {
    const activity = await recordActivity({ type: "login_failed", actor: "anonymous", summary: "Failed login" });
    await activity.finish({ status: "error", summary: "Failed login", errorMessage: "Invalid password", detail: { userAgent } });
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const activity = await recordActivity({ type: "login", actor: "operator", summary: "Login" });
  await activity.finish({ status: "success", summary: "Login success", detail: { userAgent } });

  const response = NextResponse.json({ ok: true });
  setAccessCookie(response);
  return response;
}
