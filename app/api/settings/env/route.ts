import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { allowedSettingsEnvKeys } from "@/lib/integration-config";
import { removeLocalEnv, upsertLocalEnv } from "@/lib/server-env";

export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "In production, update keys in Vercel environment variables." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: "save" | "remove";
    values?: Record<string, string>;
    keys?: string[];
  };

  if (body.action === "save") {
    const values = Object.fromEntries(Object.entries(body.values ?? {}).filter(([key, value]) => allowedSettingsEnvKeys.has(key) && value.trim()));
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "Enter at least one value to save." }, { status: 400 });
    }
    upsertLocalEnv(values);
    return NextResponse.json({ message: "API settings saved. Refreshing status." });
  }

  if (body.action === "remove") {
    const keys = (body.keys ?? []).filter((key) => allowedSettingsEnvKeys.has(key));
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid keys selected for removal." }, { status: 400 });
    }
    removeLocalEnv(keys);
    return NextResponse.json({ message: "App-local API settings removed. Refreshing status." });
  }

  return NextResponse.json({ error: "Unknown settings action." }, { status: 400 });
}
