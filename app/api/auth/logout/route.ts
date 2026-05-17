import { NextResponse } from "next/server";
import { clearAccessCookie } from "@/lib/auth";
import { recordActivity } from "@/lib/support/activity";

export async function POST() {
  const activity = await recordActivity({ type: "logout", actor: "operator", summary: "Logout" });
  const response = NextResponse.json({ ok: true });
  clearAccessCookie(response);
  await activity.finish({ status: "success", summary: "Logout" });
  return response;
}
