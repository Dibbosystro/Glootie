import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Kpi } from "@/lib/types";

const toneClass: Record<Kpi["tone"], { text: string; bg: string; line: string; up: boolean }> = {
  good: { text: "text-emerald-700", bg: "bg-emerald-50", line: "bg-emerald-500", up: true },
  warn: { text: "text-[#b45309]", bg: "bg-[#fef3c7]", line: "bg-[#b45309]", up: false },
  bad: { text: "text-[#b45309]", bg: "bg-[#fef3c7]", line: "bg-[#b45309]", up: false },
  neutral: { text: "text-[#b45309]", bg: "bg-[#fef3c7]", line: "bg-[#b45309]", up: true }
};

const sparkData = [
  [18, 23, 28, 25, 31, 34, 39, 37],
  [36, 35, 34, 31, 29, 28, 27, 25],
  [12, 16, 15, 18, 22, 21, 24, 28],
  [30, 27, 25, 22, 21, 19, 17, 16]
];

export function MetricStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <section className="metric-grid">
      {kpis.map((kpi, index) => {
        const tone = toneClass[kpi.tone];
        const Icon = tone.up ? ArrowUpRight : ArrowDownRight;
        return (
          <div key={kpi.label} className="metric-cell flex flex-col">
            <div className="text-[11px] font-medium text-[#57534e]">{kpi.label}</div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="mono text-[26px] font-bold leading-none tracking-[-0.02em] text-stone-950">{kpi.value}</div>
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${tone.bg} ${tone.text}`}>
                <Icon className="h-3 w-3" />
                {kpi.tone === "neutral" ? "Live" : kpi.tone === "good" ? "Good" : "Check"}
              </div>
            </div>
            <div className="mt-auto flex items-end justify-between gap-3 pt-4">
              <Sparkline values={sparkData[index % sparkData.length]} positive={tone.up} />
              <div className={`h-0.5 w-24 rounded-full ${tone.line}`} />
            </div>
            <div className={`mt-2 truncate text-[11px] font-semibold ${tone.text}`}>{kpi.helper}</div>
          </div>
        );
      })}
    </section>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const width = 82;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const step = width / (values.length - 1);
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-20 overflow-visible">
      <path d={path} fill="none" stroke={positive ? "#059669" : "#b45309"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
