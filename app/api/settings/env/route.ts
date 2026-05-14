import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { removeStoredIntegrationCredentials, upsertStoredIntegrationCredentials } from "@/lib/db/credentials";
import { getSettingsIntegrationForKey, allowedSettingsEnvKeys } from "@/lib/integration-config";
import { canEncryptCredentials } from "@/lib/security/encryption";
import { removeLocalEnv, upsertLocalEnv } from "@/lib/server-env";

export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

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

    if (shouldUseDatabaseCredentials()) {
      if (!canEncryptCredentials()) {
        return NextResponse.json({ error: "Set CREDENTIAL_ENCRYPTION_KEY before saving production credentials." }, { status: 400 });
      }

      const grouped = groupValuesByIntegration(values);
      for (const [integrationType, integrationValues] of Object.entries(grouped)) {
        await upsertStoredIntegrationCredentials(integrationType, integrationValues);
      }

      return NextResponse.json({ message: "Encrypted credentials saved to the database. Refreshing status." });
    }

    upsertLocalEnv(values);
    return NextResponse.json({ message: "App-local API settings saved. Refreshing status." });
  }

  if (body.action === "remove") {
    const keys = (body.keys ?? []).filter((key) => allowedSettingsEnvKeys.has(key));
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid keys selected for removal." }, { status: 400 });
    }

    if (shouldUseDatabaseCredentials()) {
      const integrationTypes = new Set(keys.map((key) => getSettingsIntegrationForKey(key)?.id).filter((id): id is string => Boolean(id)));
      for (const integrationType of integrationTypes) {
        await removeStoredIntegrationCredentials(integrationType);
      }
      return NextResponse.json({ message: "Encrypted credentials removed from the database. Refreshing status." });
    }

    removeLocalEnv(keys);
    return NextResponse.json({ message: "App-local API settings removed. Refreshing status." });
  }

  return NextResponse.json({ error: "Unknown settings action." }, { status: 400 });
}

function shouldUseDatabaseCredentials(): boolean {
  return Boolean(getDb()) && process.env.NODE_ENV === "production";
}

function groupValuesByIntegration(values: Record<string, string>): Record<string, Record<string, string>> {
  const grouped: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(values)) {
    const integration = getSettingsIntegrationForKey(key);
    if (!integration) continue;
    grouped[integration.id] = { ...(grouped[integration.id] ?? {}), [key]: value };
  }
  return grouped;
}
