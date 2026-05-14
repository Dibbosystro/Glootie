import { NextResponse } from "next/server";
import { clearAccessCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAccessCookie(response);
  return response;
}
