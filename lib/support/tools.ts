import "server-only";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { kbDocuments, products } from "@/lib/db/schema";
import { upsertClient } from "@/lib/db/persistence";
import { seedClient, seedProducts } from "@/lib/seed";

export interface KbHit {
  slug: string;
  title: string;
  snippet: string;
}

export interface ProductHit {
  title: string;
  handle: string;
  shopifyId: string;
  price: string;
  inventoryQty: number;
  status: string;
}

// Returns up to 5 KB sections whose markdown contains the query terms.
// For a small KB (<20 articles) ILIKE is cheaper and simpler than tsvector.
export async function searchKb(query: string): Promise<KbHit[]> {
  const db = getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (!db) return [];

  const clientId = await upsertClient(seedClient);
  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9.\-]/g, ""))
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return [];

  const rows = await db
    .select({ slug: kbDocuments.slug, title: kbDocuments.title, contentMd: kbDocuments.contentMd })
    .from(kbDocuments)
    .where(and(eq(kbDocuments.clientId, clientId), or(...tokens.map((t) => ilike(kbDocuments.contentMd, `%${t}%`))) ));

  // Score by how many tokens match, then build a snippet around the first hit.
  const scored = rows
    .map((row) => {
      const lower = row.contentMd.toLowerCase();
      let score = 0;
      let firstHit = -1;
      for (const token of tokens) {
        const i = lower.indexOf(token.toLowerCase());
        if (i >= 0) {
          score += 1;
          if (firstHit < 0 || i < firstHit) firstHit = i;
        }
      }
      const start = Math.max(0, firstHit - 80);
      const snippet = row.contentMd.slice(start, start + 400).replace(/\s+/g, " ").trim();
      return { slug: row.slug, title: row.title, snippet: snippet || row.contentMd.slice(0, 400), score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(({ score, ...rest }) => {
    void score;
    return rest;
  });
}

// Live product + stock lookup. Falls back to seed data when DB is empty (cold-start).
export async function getProductSnapshot(idOrHandleOrTitle: string): Promise<ProductHit | null> {
  const needle = idOrHandleOrTitle.trim();
  if (!needle) return null;

  const db = getDb();
  if (db) {
    const clientId = await upsertClient(seedClient);
    const rows = await db
      .select({
        title: products.title,
        handle: products.handle,
        shopifyId: products.shopifyId,
        price: products.price,
        inventoryQty: products.inventoryQty,
        status: products.status,
        updatedAt: products.updatedAt
      })
      .from(products)
      .where(
        and(
          eq(products.clientId, clientId),
          or(
            eq(products.shopifyId, needle),
            eq(products.handle, needle.toLowerCase()),
            ilike(products.title, `%${needle}%`),
            ilike(products.handle, `%${needle.toLowerCase()}%`)
          )
        )
      )
      .orderBy(desc(products.updatedAt))
      .limit(1);

    if (rows[0]) {
      return {
        title: rows[0].title,
        handle: rows[0].handle,
        shopifyId: rows[0].shopifyId,
        price: String(rows[0].price),
        inventoryQty: rows[0].inventoryQty,
        status: rows[0].status
      };
    }
  }

  // Fallback: seed catalog so the agent can still respond even before first Shopify sync.
  const lower = needle.toLowerCase();
  const seedMatch = seedProducts.find(
    (p) => p.id === needle || p.shopifyId === needle || p.handle === lower || p.title.toLowerCase().includes(lower)
  );
  if (!seedMatch) return null;
  return {
    title: seedMatch.title,
    handle: seedMatch.handle,
    shopifyId: seedMatch.shopifyId,
    price: String(seedMatch.price),
    inventoryQty: seedMatch.inventoryQty,
    status: seedMatch.status
  };
}

export interface DbStatus {
  ready: boolean;
  productsRows: number;
  kbRows: number;
}

export async function getSupportDataStatus(): Promise<DbStatus> {
  const db = getDb();
  if (!db) return { ready: false, productsRows: 0, kbRows: 0 };

  try {
    const clientId = await upsertClient(seedClient);
    const [productRow] = await db.select({ c: sql<number>`count(*)::int` }).from(products).where(eq(products.clientId, clientId));
    const [kbRow] = await db.select({ c: sql<number>`count(*)::int` }).from(kbDocuments).where(eq(kbDocuments.clientId, clientId));
    return { ready: true, productsRows: productRow?.c ?? 0, kbRows: kbRow?.c ?? 0 };
  } catch {
    return { ready: false, productsRows: 0, kbRows: 0 };
  }
}
