import { NextResponse } from "next/server";
import { setAccessCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.APP_ACCESS_PASSWORD;
  if (expected && body.password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  setAccessCookie(response);
  return response;
}
