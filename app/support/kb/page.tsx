import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/data";
import { listKbArticles } from "@/lib/support/kb";
import { dateShort } from "@/lib/format";

export default async function SupportKbPage() {
  const data = await getDashboardData();
  const articles = await listKbArticles();

  return (
    <AppShell data={data}>
      <div className="space-y-6">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Support</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Knowledge base</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#57534e]">
              Articles the customer support agent reads from. Sync this list with the workspace by running
              <code className="mx-1 rounded bg-[#f5f5f4] px-1 py-0.5 text-[12px]">python3 clients/cafe-racer-garage/CRG-Master-KB/push_kb_to_glootie.py</code>.
            </p>
          </div>
        </section>

        {articles.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[#57534e]">
            No KB articles yet. Run the push script from the workspace to seed them.
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
              <div key={article.id} className="card flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-bold text-[#1c1917]">{article.title}</h2>
                    <span className="rounded-full bg-[#f5f5f4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#78716c]">
                      v{article.currentVersion}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#78716c]">
                    Slug: <span className="mono">{article.slug}</span> · Updated by {article.updatedBy} · {dateShort(article.updatedAt.toISOString())}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-[#57534e]">
                    {article.contentMd.slice(0, 240)}
                    {article.contentMd.length > 240 ? "..." : ""}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-[11px] font-bold text-[#78716c]">{article.contentMd.length.toLocaleString()} chars</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card p-5">
          <h2 className="text-sm font-bold text-[#1c1917]">How to refresh</h2>
          <ol className="mt-2 space-y-1 text-sm text-[#57534e]">
            <li>1. From the workspace root, run <code className="mono rounded bg-[#f5f5f4] px-1 py-0.5 text-[12px]">python3 clients/cafe-racer-garage/CRG-Master-KB/push_kb_to_glootie.py</code>.</li>
            <li>2. The script reads the curated markdown files and POSTs them to Glootie. Unchanged articles are skipped.</li>
            <li>3. Reload this page. Updated articles bump their version number.</li>
          </ol>
          <p className="mt-3 text-xs text-[#78716c]">
            In-browser editing arrives in Phase 2.5. For now the workspace markdown is the source of truth, this page is read-only.
          </p>
        </div>

        <p className="text-[11px] text-[#78716c]">
          <Link className="underline" href="/">Back to overview</Link>
        </p>
      </div>
    </AppShell>
  );
}
