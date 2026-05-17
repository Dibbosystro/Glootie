import Link from "next/link";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/data";
import { listActivityTypes, listRecentActivity, type ActivityRow, type ActivityStatus } from "@/lib/support/activity";

export const dynamic = "force-dynamic";

const ALL = "all";

interface PageProps {
  searchParams?: Promise<{ type?: string | string[]; status?: string | string[] }>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const data = await getDashboardData();
  const params = await searchParams;
  const typeFilter = parseStr(params?.type) ?? ALL;
  const statusFilter = parseStatus(params?.status) ?? ALL;

  const [rows, allTypes] = await Promise.all([
    listRecentActivity({
      type: typeFilter === ALL ? undefined : typeFilter,
      status: statusFilter === ALL ? undefined : (statusFilter as ActivityStatus),
      limit: 200
    }),
    listActivityTypes()
  ]);

  const counts = countByStatus(rows);

  return (
    <AppShell data={data}>
      <div className="space-y-6">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Activity</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#57534e]">
              Every task Glootie ran. Logins, sync runs, AI compose calls, KB pushes. Filter by type or status to spot failures.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatusCard label="Total (last 200)" value={rows.length} tone="neutral" />
          <StatusCard label="Success" value={counts.success} tone="good" />
          <StatusCard label="Running" value={counts.running} tone="warn" />
          <StatusCard label="Error" value={counts.error} tone="bad" />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <FilterChip label="Status" active={statusFilter === ALL} href={hrefFor({ type: typeFilter })}>
            All
          </FilterChip>
          {(["running", "success", "error"] as ActivityStatus[]).map((s) => (
            <FilterChip key={s} label="Status" active={statusFilter === s} href={hrefFor({ type: typeFilter, status: s })}>
              {s}
            </FilterChip>
          ))}
          <span className="mx-2 text-[#d6d3d1]">|</span>
          <FilterChip label="Type" active={typeFilter === ALL} href={hrefFor({ status: statusFilter })}>
            All types
          </FilterChip>
          {allTypes.map((t) => (
            <FilterChip key={t} label="Type" active={typeFilter === t} href={hrefFor({ type: t, status: statusFilter })}>
              {t}
            </FilterChip>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[#57534e]">
            No activity matches these filters. Try changing the type or status filter, or trigger a sync from the Overview page.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-[#fafaf9] text-xs text-[#57534e]">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Status</th>
                  <th className="px-3 py-2 text-left font-bold">Type</th>
                  <th className="px-3 py-2 text-left font-bold">Summary</th>
                  <th className="px-3 py-2 text-left font-bold">Actor</th>
                  <th className="px-3 py-2 text-left font-bold">Started</th>
                  <th className="px-3 py-2 text-right font-bold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#e7e5e4] align-top">
                    <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2 font-bold text-[#1c1917]">{row.type}</td>
                    <td className="px-3 py-2 text-[#1c1917]">
                      <div className="line-clamp-2">{row.summary || "(no summary)"}</div>
                      {row.errorMessage && (
                        <div className="mt-1 line-clamp-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-800">{row.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#57534e]">{row.actor}</td>
                    <td className="px-3 py-2 text-[11px] text-[#78716c]">{formatTime(row.startedAt)}</td>
                    <td className="px-3 py-2 text-right text-[11px] text-[#78716c]">{formatDuration(row.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-[#78716c]">
          Showing newest first. Older rows are kept in the database forever. <Link className="underline" href="/">Back to overview</Link>
        </p>
      </div>
    </AppShell>
  );
}

function parseStr(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseStatus(value: string | string[] | undefined): string | undefined {
  const s = parseStr(value);
  if (!s) return undefined;
  if (s === "running" || s === "success" || s === "error" || s === ALL) return s;
  return undefined;
}

function hrefFor(filters: { type?: string; status?: string }): string {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== ALL) params.set("type", filters.type);
  if (filters.status && filters.status !== ALL) params.set("status", filters.status);
  const q = params.toString();
  return q ? `/activity?${q}` : "/activity";
}

function countByStatus(rows: ActivityRow[]) {
  return rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { running: 0, success: 0, error: 0 } as Record<ActivityStatus, number>
  );
}

function formatTime(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> success
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
        <XCircle className="h-3 w-3" /> error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
      <Loader2 className="h-3 w-3 animate-spin" /> running
    </span>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" | "neutral" }) {
  const toneClass: Record<typeof tone, string> = {
    good: "border-emerald-200 bg-emerald-50",
    warn: "border-amber-200 bg-amber-50",
    bad: "border-red-200 bg-red-50",
    neutral: "border-[#e7e5e4] bg-white"
  };
  return (
    <div className={`rounded-md border ${toneClass[tone]} p-4`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#57534e]">{label}</div>
      <div className="mono mt-1 text-2xl font-bold text-[#1c1917]">{value}</div>
    </div>
  );
}

function FilterChip({ active, href, children }: { label: string; active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-bold transition ${
        active ? "border-[#1c1917] bg-[#1c1917] text-white" : "border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#fbbf24] hover:bg-[#fffbeb]"
      }`}
    >
      {active && <CircleDashed className="h-3 w-3" />}
      {children}
    </Link>
  );
}
