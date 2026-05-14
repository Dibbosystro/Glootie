import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { upsertClient } from "@/lib/db/persistence";
import { seedClient } from "@/lib/seed";
import { decryptJson, encryptJson } from "@/lib/security/encryption";
import { getServerEnv } from "@/lib/server-env";
import type { Client } from "@/lib/types";

type CredentialBag = Record<string, string>;

export async function getCredentialValue(integrationType: string, key: string, client: Client = seedClient): Promise<string | undefined> {
  const stored = await getStoredIntegrationCredentials(integrationType, client);
  return stored[key] || getServerEnv(key);
}

export async function getStoredIntegrationCredentials(integrationType: string, client: Client = seedClient): Promise<CredentialBag> {
  const db = getDb();
  if (!db) return {};

  const clientId = await upsertClient(client);
  const [row] = await db
    .select({ encryptedCredentials: integrations.encryptedCredentials })
    .from(integrations)
    .where(and(eq(integrations.clientId, clientId), eq(integrations.type, integrationType)))
    .limit(1);

  return decryptJson<CredentialBag>(row?.encryptedCredentials) ?? {};
}

export async function hasStoredCredentialKey(integrationType: string, key: string, client: Client = seedClient): Promise<boolean> {
  const stored = await getStoredIntegrationCredentials(integrationType, client);
  return Boolean(stored[key]);
}

export async function isCredentialKeyConfigured(integrationType: string, key: string, client: Client = seedClient): Promise<boolean> {
  if (getServerEnv(key)) return true;
  try {
    return await hasStoredCredentialKey(integrationType, key, client);
  } catch {
    return false;
  }
}

export async function upsertStoredIntegrationCredentials(integrationType: string, values: CredentialBag, client: Client = seedClient): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is required for encrypted credential storage.");

  const cleaned = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()));
  if (Object.keys(cleaned).length === 0) return;

  const clientId = await upsertClient(client);
  const existing = await getStoredIntegrationCredentials(integrationType, client);
  const encryptedCredentials = encryptJson({ ...existing, ...cleaned });

  await db
    .insert(integrations)
    .values({
      clientId,
      type: integrationType,
      status: "connected",
      encryptedCredentials,
      lastSyncedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [integrations.clientId, integrations.type],
      set: {
        status: "connected",
        encryptedCredentials,
        errorMessage: null,
        lastSyncedAt: new Date()
      }
    });
}

export async function removeStoredIntegrationCredentials(integrationType: string, client: Client = seedClient): Promise<void> {
  const db = getDb();
  if (!db) return;

  const clientId = await upsertClient(client);
  await db
    .insert(integrations)
    .values({
      clientId,
      type: integrationType,
      status: "missing",
      encryptedCredentials: null,
      lastSyncedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [integrations.clientId, integrations.type],
      set: {
        status: "missing",
        encryptedCredentials: null,
        errorMessage: null,
        lastSyncedAt: new Date()
      }
    });
}
