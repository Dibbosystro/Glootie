import Link from "next/link";
import type { AdCampaign } from "@/lib/types";
import { currency, roas } from "@/lib/format";

type Metric = "spend" | "revenue";

export function SpendTreemap({ campaigns, metric = "spend", title, subtitle, href }: { campaigns: AdCampaign[]; metric?: Metric; title: string; subtitle: string; href?: string }) {
  const items = buildItems(campaigns, metric);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">{title}</div>
          <p className="mt-1 text-[11px] text-[#57534e]">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="mono text-lg font-bold leading-none tracking-[-0.02em] text-[#1c1917]">{currency(total)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78716c]">total {metric}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 grid h-[240px] place-items-center rounded-lg border border-dashed border-[#d6d3d1] text-xs text-[#78716c]">
          No campaigns to chart yet.
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid h-[240px] gap-1.5" style={{ gridTemplateColumns: gridTemplate(items, total) }}>
            {items.map((item, index) => {
              const style = { background: roasColor(item.roas), gridRow: `span ${rowSpan(index, items.length)}` };
              const tooltip = `${item.name} · ${currency(item.value)} · ${roas(item.roas)}`;
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-bold leading-tight">{item.name}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] opacity-80">{item.source}</div>
                  </div>
                  <div className="mt-2">
                    <div className="mono text-[15px] font-bold leading-none">{currency(item.value)}</div>
                    <div className="mt-1 text-[10px] font-semibold opacity-90">{roas(item.roas)} ROAS</div>
                  </div>
                </>
              );
              const className = "flex flex-col justify-between overflow-hidden rounded-md p-3 text-white transition hover:opacity-90";
              if (href) {
                return (
                  <Link key={item.id} href={href} className={className} style={style} title={tooltip}>
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={item.id} className={className} style={style} title={tooltip}>
                  {inner}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#57534e]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#166534]" />
              ROAS ≥ 3x
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#15803d]" />
              2 – 3x
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#b45309]" />
              1 – 2x
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#92400e]" />
              under 1x
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#44403c]" />
              no spend
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface TreemapItem {
  id: string;
  name: string;
  source: string;
  value: number;
  roas: number;
}

function buildItems(campaigns: AdCampaign[], metric: Metric): TreemapItem[] {
  return campaigns
    .map((campaign) => {
      const value = metric === "spend" ? campaign.spend30d : campaign.revenue30d;
      const spendForRoas = Math.max(campaign.spend30d, 1);
      return {
        id: campaign.id,
        name: campaign.name,
        source: campaign.source === "meta" ? "Meta" : "Google",
        value,
        roas: campaign.revenue30d / spendForRoas
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function gridTemplate(items: TreemapItem[], total: number) {
  if (items.length === 1) return "1fr";
  if (items.length === 2) return `${weight(items[0], total)} ${weight(items[1], total)}`;
  if (items.length <= 4) return "1.6fr 1fr";
  return "1.6fr 1fr 1fr";
}

function weight(item: TreemapItem, total: number) {
  const ratio = Math.max(item.value / total, 0.2);
  return `${ratio.toFixed(2)}fr`;
}

function rowSpan(index: number, count: number) {
  if (count <= 2) return 2;
  if (index === 0) return 2;
  if (count <= 4) return 1;
  if (index === 1) return 2;
  return 1;
}

function roasColor(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "#44403c";
  if (value >= 3) return "#166534";
  if (value >= 2) return "#15803d";
  if (value >= 1) return "#b45309";
  return "#92400e";
}
