import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "cc_access";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function secret(): string {
  return process.env.AUTH_COOKIE_SECRET || "dev-only-change-me";
}

export function authEnabled(): boolean {
  return Boolean(process.env.APP_ACCESS_PASSWORD);
}

export function signSession(value: string): string {
  const payload = Buffer.from(JSON.stringify({ value, exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!authEnabled()) return true;
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { value: string; exp: number };
    return parsed.value === "client-command-center" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function hasAccess(): Promise<boolean> {
  if (!authEnabled()) return true;
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

export async function requireAccess(): Promise<NextResponse | null> {
  if (await hasAccess()) return null;
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export async function requireSyncAccess(): Promise<NextResponse | null> {
  const authFailure = await requireAccess();
  if (!authFailure) return null;

  const headerStore = await headers();
  const cronSecret = process.env.CRON_SECRET;
  const token = headerStore.get("authorization")?.replace(/^Bearer\s+/i, "") ?? headerStore.get("x-cron-secret");
  if (cronSecret && token === cronSecret) return null;
  return authFailure;
}

export function setAccessCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, signSession("client-command-center"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearAccessCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}
