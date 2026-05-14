import type { AdCampaign } from "@/lib/types";
import { currency, number } from "@/lib/format";

const colors = ["#b45309", "#059669", "#1c1917", "#fcd34d"];

export function AdsPieCard({
  title,
  campaigns,
  metric
}: {
  title: string;
  campaigns: AdCampaign[];
  metric: "spend30d" | "purchases30d" | "revenue30d";
}) {
  const total = campaigns.reduce((sum, campaign) => sum + Number(campaign[metric] ?? 0), 0);
  const segments = campaigns.map((campaign, index) => ({
    label: campaign.name,
    value: Number(campaign[metric] ?? 0),
    color: colors[index % colors.length]
  }));
  const gradient = buildConicGradient(segments, total);

  return (
    <div className="rounded-2xl border border-[#d6d3d1] bg-white p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-4 flex items-center gap-4">
        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: gradient }}>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center shadow-sm">
            <span className="mono text-sm font-bold">{formatValue(total, metric)}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
              <span className="min-w-0 flex-1 truncate text-[#44403c]">{segment.label}</span>
              <span className="mono font-semibold text-[#1c1917]">{formatValue(segment.value, metric)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildConicGradient(segments: Array<{ value: number; color: string }>, total: number) {
  if (total <= 0) return "conic-gradient(#d6d3d1 0deg 360deg)";
  let start = 0;
  const stops = segments.map((segment) => {
    const degrees = (segment.value / total) * 360;
    const end = start + degrees;
    const stop = `${segment.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function formatValue(value: number, metric: "spend30d" | "purchases30d" | "revenue30d") {
  if (metric === "purchases30d") return number(value);
  return currency(value);
}
