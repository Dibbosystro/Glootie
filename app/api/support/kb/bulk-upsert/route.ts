import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { bulkUpsertKbArticles, type KbArticleInput } from "@/lib/support/kb";
import { getServerEnv } from "@/lib/server-env";

function checkApiKey(provided: string | null | undefined): boolean {
  const expected = getServerEnv("SUPPORT_API_KEY");
  if (!expected) return false;
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const provided = headerStore.get("authorization")?.replace(/^Bearer\s+/i, "") ?? headerStore.get("x-support-api-key");
  if (!checkApiKey(provided)) {
    return NextResponse.json({ error: "Unauthorized. Set Authorization: Bearer <SUPPORT_API_KEY>." }, { status: 401 });
  }

  let body: { editor?: string; articles?: KbArticleInput[] };
  try {
    body = (await request.json()) as { editor?: string; articles?: KbArticleInput[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const articles = body.articles ?? [];
  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: "articles[] is required and must be non-empty." }, { status: 400 });
  }

  for (const article of articles) {
    if (!article.slug || !article.title || !article.contentMd) {
      return NextResponse.json({ error: `Article is missing slug/title/contentMd: ${JSON.stringify({ slug: article.slug, title: article.title })}` }, { status: 400 });
    }
  }

  try {
    const results = await bulkUpsertKbArticles(articles, body.editor ?? "cli");
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
