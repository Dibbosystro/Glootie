import "server-only";

import { cache as reactCache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { upsertClient } from "@/lib/db/persistence";
import { seedClient } from "@/lib/seed";
import { decryptJson, encryptJson } from "@/lib/security/encryption";
import { getServerEnv } from "@/lib/server-env";
import type { Client } from "@/lib/backend-types";

type CredentialBag = Record<string, string>;
type CredentialBags = Record<string, CredentialBag>;

// One DB query per request loads every integration row for the client. Wrapping
// in React cache dedupes within a single request, so the chain of
// getCredentialValue / isCredentialKeyConfigured calls all share the same SELECT.
const loadCredentialBags = reactCache(async (clientName: string, clientPayload: Client): Promise<CredentialBags> => {
  void clientName;
  const db = getDb();
  if (!db) return {};

  try {
    const clientId = await upsertClient(clientPayload);
    const rows = await db
      .select({ type: integrations.type, encryptedCredentials: integrations.encryptedCredentials })
      .from(integrations)
      .where(eq(integrations.clientId, clientId));

    const bags: CredentialBags = {};
    for (const row of rows) {
      bags[row.type] = decryptJson<CredentialBag>(row.encryptedCredentials) ?? {};
    }
    return bags;
  } catch {
    return {};
  }
});

async function getCredentialBag(integrationType: string, client: Client): Promise<CredentialBag> {
  const bags = await loadCredentialBags(client.name, client);
  return bags[integrationType] ?? {};
}

export async function getCredentialValue(integrationType: string, key: string, client: Client = seedClient): Promise<string | undefined> {
  const envValue = getServerEnv(key);
  if (envValue) return envValue;
  const bag = await getCredentialBag(integrationType, client);
  return bag[key] || undefined;
}

export async function getStoredIntegrationCredentials(integrationType: string, client: Client = seedClient): Promise<CredentialBag> {
  return getCredentialBag(integrationType, client);
}

export async function hasStoredCredentialKey(integrationType: string, key: string, client: Client = seedClient): Promise<boolean> {
  const bag = await getCredentialBag(integrationType, client);
  return Boolean(bag[key]);
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
