import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AdCampaign } from "@/lib/types";
import { currency, percent, roas } from "@/lib/format";

export function CampaignPerformance({ campaigns }: { campaigns: AdCampaign[] }) {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend30d, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue30d, 0);
  const maxSpend = Math.max(...campaigns.map((c) => c.spend30d), 1);
  const sorted = [...campaigns].sort((a, b) => b.spend30d - a.spend30d || b.revenue30d - a.revenue30d);

  return (
    <div className="card overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-[#e7e5e4] p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Campaign performance</div>
          <h2 className="mt-1 text-base font-bold text-[#1c1917]">Where the money is going and coming back</h2>
          <p className="mt-1 text-[11px] text-[#57534e]">Every campaign, last 30 days. Bar = share of total spend.</p>
        </div>
        <div className="flex items-baseline gap-5 text-right">
          <div>
            <div className="mono text-lg font-bold leading-none tracking-[-0.02em] text-[#1c1917]">{currency(totalSpend)}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#78716c]">Total spend</div>
          </div>
          <div>
            <div className="mono text-lg font-bold leading-none tracking-[-0.02em] text-[#1c1917]">{currency(totalRevenue)}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#78716c]">Total revenue</div>
          </div>
          <div>
            <div className="mono text-lg font-bold leading-none tracking-[-0.02em] text-emerald-700">{roas(totalRevenue / Math.max(totalSpend, 1))}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#78716c]">Overall ROAS</div>
          </div>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="grid h-[200px] place-items-center text-sm text-[#78716c]">No campaigns to show yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#e7e5e4] text-[10px] font-bold uppercase tracking-[0.1em] text-[#78716c]">
                <th className="px-5 py-3 font-bold">Channel</th>
                <th className="py-3 pr-3 font-bold">Campaign</th>
                <th className="py-3 pr-3 font-bold">Status</th>
                <th className="py-3 pr-3 font-bold">Spend (30d)</th>
                <th className="hidden py-3 pr-3 text-right font-bold md:table-cell">Revenue</th>
                <th className="py-3 pr-5 text-right font-bold">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((campaign) => {
                const spendShare = campaign.spend30d / maxSpend;
                const roasValue = campaign.spend30d > 0 ? campaign.revenue30d / campaign.spend30d : 0;
                const href = campaign.source === "meta" ? "/ads/meta" : "/ads/google";
                return (
                  <tr key={campaign.id} className="border-b border-[#f5f5f4] hover:bg-[#fafaf9]">
                    <td className="px-5 py-3">
                      <ChannelBadge source={campaign.source} />
                    </td>
                    <td className="py-3 pr-3">
                      <Link href={href} className="block min-w-0 max-w-[280px] truncate text-[13px] font-semibold text-[#1c1917] hover:text-[#b45309]">
                        {campaign.name}
                      </Link>
                      {campaign.campaignCategoryLabel ? (
                        <div className="mt-0.5 truncate text-[11px] text-[#78716c]">{campaign.campaignCategoryLabel}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <DeliveryDot delivery={campaign.delivery} />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="mono w-[78px] shrink-0 text-[12px] font-bold text-[#1c1917]">{currency(campaign.spend30d)}</div>
                        <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-[#e7e5e4] sm:block">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(spendShare * 100, campaign.spend30d > 0 ? 4 : 0)}%`, background: roasColor(roasValue) }}
                          />
                        </div>
                      </div>
                      {totalSpend > 0 ? (
                        <div className="ml-0 mt-1 text-[10px] font-semibold text-[#78716c]">{percent(campaign.spend30d / totalSpend, 1)} of total</div>
                      ) : null}
                    </td>
                    <td className="mono hidden py-3 pr-3 text-right text-[12px] font-bold text-[#1c1917] md:table-cell">{currency(campaign.revenue30d)}</td>
                    <td className="py-3 pr-5 text-right">
                      <RoasPill value={roasValue} hasSpend={campaign.spend30d > 0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex items-center justify-end gap-4 border-t border-[#e7e5e4] px-5 py-3 text-[11px] font-semibold text-[#57534e]">
        <Link href="/ads/meta" className="inline-flex items-center gap-1 hover:text-[#b45309]">
          Meta Ads
          <ChevronRight className="h-3 w-3" />
        </Link>
        <Link href="/ads/google" className="inline-flex items-center gap-1 hover:text-[#b45309]">
          Google Ads
          <ChevronRight className="h-3 w-3" />
        </Link>
      </footer>
    </div>
  );
}

function ChannelBadge({ source }: { source: AdCampaign["source"] }) {
  const meta = source === "meta";
  return (
    <span
      className={`mono inline-flex h-6 min-w-[42px] items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-[0.06em] ${
        meta ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#fef3c7] text-[#92400e]"
      }`}
    >
      {meta ? "Meta" : "Google"}
    </span>
  );
}

function DeliveryDot({ delivery }: { delivery: AdCampaign["delivery"] }) {
  const tone =
    delivery === "active"
      ? "bg-emerald-100 text-emerald-700"
      : delivery === "learning"
      ? "bg-blue-100 text-blue-700"
      : delivery === "limited"
      ? "bg-amber-100 text-amber-800"
      : "bg-[#f5f5f4] text-[#57534e]";
  const dot =
    delivery === "active"
      ? "bg-emerald-500"
      : delivery === "learning"
      ? "bg-blue-500"
      : delivery === "limited"
      ? "bg-amber-500"
      : "bg-[#a8a29e]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {delivery}
    </span>
  );
}

function RoasPill({ value, hasSpend }: { value: number; hasSpend: boolean }) {
  if (!hasSpend) {
    return <span className="mono text-[12px] font-bold text-[#a8a29e]">—</span>;
  }
  const tone =
    value >= 3
      ? "bg-emerald-100 text-emerald-800"
      : value >= 2
      ? "bg-emerald-50 text-emerald-700"
      : value >= 1
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";
  return <span className={`mono inline-flex justify-end rounded-md px-2 py-0.5 text-[12px] font-bold ${tone}`}>{roas(value)}</span>;
}

function roasColor(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "#a8a29e";
  if (value >= 3) return "#15803d";
  if (value >= 2) return "#16a34a";
  if (value >= 1) return "#b45309";
  return "#b91c1c";
}
