import "server-only";

import { desc, eq, ne, and, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityLog } from "@/lib/db/schema";
import { upsertClient } from "@/lib/db/persistence";
import { seedClient } from "@/lib/seed";

export type ActivityStatus = "running" | "success" | "error";

export interface RecordOptions {
  type: string;
  actor?: string;
  summary?: string;
  detail?: unknown;
}

export interface ActivityHandle {
  id: string | null;
  finish: (final: { status: ActivityStatus; summary?: string; detail?: unknown; errorMessage?: string }) => Promise<void>;
}

const NO_OP: ActivityHandle = { id: null, finish: async () => {} };

// Start a row in activity_log with status=running. Returns a handle whose
// finish() updates the row with final status + duration. Safe to call even
// when DB is not configured (returns a no-op handle so callers don't break).
export async function recordActivity(opts: RecordOptions): Promise<ActivityHandle> {
  const db = getDb();
  if (!db) return NO_OP;

  try {
    const clientId = await upsertClient(seedClient);
    const [row] = await db
      .insert(activityLog)
      .values({
        clientId,
        type: opts.type,
        status: "running",
        actor: opts.actor ?? "system",
        summary: opts.summary ?? "",
        detail: (opts.detail ?? null) as never
      })
      .returning({ id: activityLog.id, startedAt: activityLog.startedAt });

    if (!row) return NO_OP;
    const startedAt = row.startedAt;

    return {
      id: row.id,
      finish: async (final) => {
        const finishedAt = new Date();
        const durationMs = Math.max(0, finishedAt.getTime() - new Date(startedAt).getTime());
        await db
          .update(activityLog)
          .set({
            status: final.status,
            summary: final.summary ?? opts.summary ?? "",
            detail: (final.detail ?? opts.detail ?? null) as never,
            errorMessage: final.errorMessage ?? null,
            finishedAt,
            durationMs
          })
          .where(eq(activityLog.id, row.id));
      }
    };
  } catch {
    return NO_OP;
  }
}

export interface ActivityRow {
  id: string;
  type: string;
  status: ActivityStatus;
  actor: string;
  summary: string;
  detail: unknown;
  errorMessage: string | null;
  durationMs: number | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export async function listRecentActivity(filters?: { type?: string; status?: ActivityStatus; limit?: number }): Promise<ActivityRow[]> {
  const db = getDb();
  if (!db) return [];
  const limit = filters?.limit ?? 100;

  const whereClauses: SQL[] = [];
  if (filters?.type) whereClauses.push(eq(activityLog.type, filters.type));
  if (filters?.status) whereClauses.push(eq(activityLog.status, filters.status));

  const baseQuery = db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.startedAt))
    .limit(limit);

  const rows = whereClauses.length > 0
    ? await baseQuery.where(whereClauses.length === 1 ? whereClauses[0] : and(...whereClauses))
    : await baseQuery;

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status as ActivityStatus,
    actor: r.actor,
    summary: r.summary,
    detail: r.detail,
    errorMessage: r.errorMessage,
    durationMs: r.durationMs,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt
  }));
}

export async function listActivityTypes(): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ type: activityLog.type })
    .from(activityLog)
    .where(ne(activityLog.type, ""));
  return rows.map((r) => r.type).sort();
}
