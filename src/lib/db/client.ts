import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/server-env";
import * as schema from "@/lib/db/schema";

type GlootieDatabase = NeonHttpDatabase<typeof schema>;

let cachedDb: GlootieDatabase | null | undefined;

export function hasDatabaseUrl(): boolean {
  return Boolean(getServerEnv("DATABASE_URL"));
}

export function getDb(): GlootieDatabase | null {
  if (cachedDb !== undefined) return cachedDb;

  const databaseUrl = getServerEnv("DATABASE_URL");
  if (!databaseUrl) {
    cachedDb = null;
    return cachedDb;
  }

  cachedDb = drizzle(neon(databaseUrl), { schema });
  return cachedDb;
}
