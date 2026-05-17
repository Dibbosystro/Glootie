import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { bulkUpsertKbArticles, type KbArticleInput } from "@/lib/support/kb";
import { recordActivity } from "@/lib/support/activity";
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

  const activity = await recordActivity({
    type: "kb_push",
    actor: body.editor ?? "cli",
    summary: `KB push: ${articles.length} articles`,
    detail: { slugs: articles.map((a) => a.slug) }
  });

  try {
    const results = await bulkUpsertKbArticles(articles, body.editor ?? "cli");
    revalidatePath("/support/kb");
    revalidatePath("/support");
    const counts = results.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    await activity.finish({
      status: "success",
      summary: `KB push: ${results.length} articles (created=${counts.created ?? 0}, updated=${counts.updated ?? 0}, unchanged=${counts.unchanged ?? 0})`,
      detail: { results }
    });
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await activity.finish({ status: "error", summary: "KB push failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
