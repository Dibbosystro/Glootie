import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { kbDocuments, kbDocumentVersions } from "@/lib/db/schema";
import { upsertClient } from "@/lib/db/persistence";
import { seedClient } from "@/lib/seed";

export interface KbArticleInput {
  slug: string;
  title: string;
  contentMd: string;
}

export interface KbArticleRow {
  id: string;
  slug: string;
  title: string;
  contentMd: string;
  currentVersion: number;
  updatedBy: string;
  updatedAt: Date;
}

export interface BulkUpsertResult {
  slug: string;
  status: "created" | "updated" | "unchanged";
  version: number;
}

export async function listKbArticles(): Promise<KbArticleRow[]> {
  const db = getDb();
  if (!db) return [];

  const clientId = await upsertClient(seedClient);
  const rows = await db
    .select()
    .from(kbDocuments)
    .where(eq(kbDocuments.clientId, clientId))
    .orderBy(asc(kbDocuments.slug));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    contentMd: row.contentMd,
    currentVersion: row.currentVersion,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt
  }));
}

export async function bulkUpsertKbArticles(articles: KbArticleInput[], editor: string): Promise<BulkUpsertResult[]> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured. Set DATABASE_URL in Glootie env.");

  const clientId = await upsertClient(seedClient);
  const results: BulkUpsertResult[] = [];

  for (const article of articles) {
    const existing = await db
      .select()
      .from(kbDocuments)
      .where(and(eq(kbDocuments.clientId, clientId), eq(kbDocuments.slug, article.slug)))
      .limit(1);

    if (!existing[0]) {
      const [created] = await db
        .insert(kbDocuments)
        .values({
          clientId,
          slug: article.slug,
          title: article.title,
          contentMd: article.contentMd,
          currentVersion: 1,
          updatedBy: editor
        })
        .returning({ id: kbDocuments.id });
      if (!created) throw new Error(`Could not create ${article.slug}`);

      await db.insert(kbDocumentVersions).values({
        documentId: created.id,
        version: 1,
        contentMd: article.contentMd,
        editor
      });

      results.push({ slug: article.slug, status: "created", version: 1 });
      continue;
    }

    if (existing[0].contentMd === article.contentMd && existing[0].title === article.title) {
      results.push({ slug: article.slug, status: "unchanged", version: existing[0].currentVersion });
      continue;
    }

    const nextVersion = existing[0].currentVersion + 1;
    await db
      .update(kbDocuments)
      .set({
        title: article.title,
        contentMd: article.contentMd,
        currentVersion: nextVersion,
        updatedBy: editor,
        updatedAt: new Date()
      })
      .where(eq(kbDocuments.id, existing[0].id));

    await db.insert(kbDocumentVersions).values({
      documentId: existing[0].id,
      version: nextVersion,
      contentMd: article.contentMd,
      editor
    });

    results.push({ slug: article.slug, status: "updated", version: nextVersion });
  }

  return results;
}
