import Link from "next/link";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReplyComposer } from "@/components/reply-composer";
import { getDashboardData } from "@/lib/data";
import { getSupportDataStatus } from "@/lib/support/tools";

export const dynamic = "force-dynamic";

export default async function SupportComposePage() {
  const data = await getDashboardData();
  const status = await getSupportDataStatus();

  return (
    <AppShell data={data}>
      <div className="space-y-6">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Support</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Reply Composer</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#57534e]">
              Paste a customer message. The agent searches the KB and looks up live Shopify stock before drafting a reply you can paste back.
            </p>
          </div>
          <Link
            href="/support/kb"
            className="inline-flex items-center gap-2 rounded-md border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-bold text-[#1c1917] transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            KB Articles
          </Link>
        </section>

        <div className="flex flex-wrap items-center gap-4 rounded-md border border-[#e7e5e4] bg-[#fafaf9] px-4 py-2 text-[11px] text-[#57534e]">
          <span className="font-bold uppercase tracking-[0.08em] text-[#78716c]">Status</span>
          <span className={status.ready ? "text-emerald-700" : "text-amber-700"}>
            {status.ready ? "DB connected" : "DB not configured"}
          </span>
          <span>· {status.kbRows} KB articles</span>
          <span>· {status.productsRows} products synced from Shopify</span>
          {status.productsRows === 0 && status.ready && (
            <span className="text-amber-700">(click Sync on Overview to pull Shopify products)</span>
          )}
        </div>

        <ReplyComposer />
      </div>
    </AppShell>
  );
}
