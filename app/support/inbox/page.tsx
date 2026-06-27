import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChatwayInbox } from "@/components/chatway-inbox";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SupportInboxPage() {
  const data = await getDashboardData();

  return (
    <AppShell data={data}>
      <div className="space-y-6">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Support</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Chatway Inbox</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#57534e]">
              Customers waiting on a reply. Open a thread, generate a grounded draft, edit it, add a product link, then
              send it back to Chatway or drop it in as an internal note.
            </p>
          </div>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-md border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-bold text-[#1c1917] transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Free-text Composer
          </Link>
        </section>

        <ChatwayInbox />
      </div>
    </AppShell>
  );
}
